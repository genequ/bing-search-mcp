/**
 * 必应搜索API模块
 * 负责发起HTTP请求并获取搜索页面
 * - 中文市场 (zh-CN): 使用 axios 直接获取 HTML
 * - 其他市场: 使用 Puppeteer 处理 JavaScript 渲染
 */

import axios, { AxiosRequestConfig } from 'axios';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';

// Bing 域名映射表
const BING_DOMAINS: Record<string, string> = {
  'zh-CN': 'cn.bing.com',
  'en-US': 'www.bing.com',
  'en-GB': 'www.bing.com',
  'en-AU': 'www.bing.com',
  'en-CA': 'www.bing.com',
  'ja-JP': 'www.bing.com',
  'ko-KR': 'www.bing.com',
  'de-DE': 'www.bing.com',
  'fr-FR': 'www.bing.com',
  'es-ES': 'www.bing.com',
  'it-IT': 'www.bing.com',
  'pt-BR': 'www.bing.com',
  'ru-RU': 'www.bing.com',
};

// Accept-Language 映射表
const ACCEPT_LANGUAGES: Record<string, string> = {
  'zh-CN': 'zh-CN,zh;q=0.9,en;q=0.8',
  'en-US': 'en-US,en;q=0.9',
  'en-GB': 'en-GB,en;q=0.9',
  'en-AU': 'en-AU,en;q=0.9',
  'en-CA': 'en-CA,en;q=0.9',
  'ja-JP': 'ja-JP,ja;q=0.9,en;q=0.8',
  'ko-KR': 'ko-KR,ko;q=0.9,en;q=0.8',
  'de-DE': 'de-DE,de;q=0.9,en;q=0.8',
  'fr-FR': 'fr-FR,fr;q=0.9,en;q=0.8',
  'es-ES': 'es-ES,es;q=0.9,en;q=0.8',
  'it-IT': 'it-IT,it;q=0.9,en;q=0.8',
  'pt-BR': 'pt-BR,pt;q=0.9,en;q=0.8',
  'ru-RU': 'ru-RU,ru;q=0.9,en;q=0.8',
};

// 用户代理，模拟浏览器访问
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Puppeteer browser instance (reused across requests)
let browserInstance: puppeteer.Browser | null = null;

/**
 * 查找系统 Chrome 浏览器路径
 */
function findChromePath(): string {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];

  // 尝试找到 Chrome 路径
  for (const path of possiblePaths) {
    try {
      if (existsSync(path)) {
        return path;
      }
    } catch {
      // 继续
    }
  }

  // 如果找不到，返回默认路径（macOS Chrome）
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

/**
 * 获取或创建 Puppeteer 浏览器实例
 */
async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browserInstance) {
    const chromePath = findChromePath();

    const launchOptions: puppeteer.LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',  // 隐藏自动化特征
        '--disable-extensions',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
      ignoreDefaultArgs: ['--enable-automation'],  // 移除自动化标志
    };

    // 如果找到了 Chrome 路径，使用它
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    browserInstance = await puppeteer.launch(launchOptions);
  }
  return browserInstance;
}

/**
 * 使用 Puppeteer 获取搜索结果（处理 JavaScript 渲染）
 */
async function fetchWithPuppeteer(
  query: string,
  count: number,
  offset: number,
  market: string
): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const domain = BING_DOMAINS[market] || 'www.bing.com';
    const acceptLanguage = ACCEPT_LANGUAGES[market] || 'en-US,en;q=0.9';
    const bingUrl = `https://${domain}/search`;

    // 设置视口大小
    await page.setViewport({ width: 1920, height: 1080 });

    // 隐藏 webdriver 特征
    await page.evaluateOnNewDocument(() => {
      // 覆盖 navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // 覆盖 chrome 对象
      (window as any).chrome = {
        runtime: {},
      };

      // 覆盖 permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: 'granted' } as PermissionStatus) :
          originalQuery(parameters)
      );
    });

    // 设置用户代理和语言
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': acceptLanguage,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    });

    // 构建搜索 URL（不包含 rdr 参数以避免重定向）
    const searchParams = new URLSearchParams({
      q: query,
      first: String(offset + 1),
      mkt: market,
    });

    // 导航到搜索页面
    await page.goto(`${bingUrl}?${searchParams}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 等待搜索结果加载
    try {
      await page.waitForSelector('li.b_algo', {
        timeout: 15000,
      });
    } catch {
      // 如果选择器不匹配，继续处理
    }

    // 额外等待，确保内容加载完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 获取页面 HTML
    const html = await page.content();

    return html;
  } finally {
    await page.close();
  }
}

/**
 * 使用 axios 获取搜索结果（适用于中文市场）
 */
async function fetchWithAxios(
  query: string,
  count: number,
  offset: number,
  market: string
): Promise<string> {
  const domain = BING_DOMAINS[market] || 'cn.bing.com';
  const acceptLanguage = ACCEPT_LANGUAGES[market] || 'zh-CN,zh;q=0.9,en;q=0.8';
  const bingUrl = `https://${domain}/search`;

  const params: Record<string, string | number> = {
    q: query,
    first: offset + 1,
    mkt: market,
  };

  const config: AxiosRequestConfig = {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': acceptLanguage,
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 15000,
  };

  const response = await axios.get(bingUrl, {
    ...config,
    params,
  });

  return response.data;
}

/**
 * 执行必应搜索请求
 * @param query 搜索关键词
 * @param count 返回结果数量
 * @param offset 偏移量
 * @param market 市场/语言代码 (如: zh-CN, en-US, en-GB, ja-JP 等)
 * @returns 返回HTML字符串
 */
export async function fetchBingSearch(
  query: string,
  count: number = 10,
  offset: number = 0,
  market: string = 'en-US'
): Promise<string> {
  try {
    // 中文市场使用 axios (更快，无需浏览器)
    if (market === 'zh-CN') {
      return await fetchWithAxios(query, count, offset, market);
    }

    // 其他市场使用 Puppeteer (处理 JavaScript 渲染)
    return await fetchWithPuppeteer(query, count, offset, market);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Bing search failed: ${error.message}` +
          (error.response ? ` (status: ${error.response.status})` : '')
      );
    }
    throw error;
  }
}

/**
 * 关闭浏览器实例（用于清理）
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
