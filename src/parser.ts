/**
 * HTML解析模块
 * 使用cheerio解析必应搜索结果页面
 * 支持中文必应 (.b_algo) 和全局必应 (多种结构)
 */

import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { SearchResult, BingSearchResponse } from './types.js';

/**
 * 从 Bing 重定向 URL 中提取真实的目标 URL
 * Bing 全局搜索使用重定向链接，格式如: https://www.bing.com/ck/a?!&&p=...&u=<base64_url>
 */
function extractRealUrlFromBingRedirect(bingUrl: string): string {
  try {
    // 查找 u= 参数
    const uMatch = bingUrl.match(/[?&]u=([^&]+)/);
    if (uMatch) {
      // 移除 'a1' 前缀并解码 base64
      let encoded = uMatch[1];
      if (encoded.startsWith('a1')) {
        encoded = encoded.substring(2);
      }
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      return decoded;
    }
  } catch {
    // 解码失败，返回原URL
  }
  return bingUrl;
}

/**
 * 解析全局必应搜索结果 (非中文市场)
 * 全局必应使用不同的 HTML 结构
 */
function parseGlobalBingResults($: cheerio.CheerioAPI, results: SearchResult[]): void {
  // 尝试多种可能的选择器
  const selectors = [
    'li.b_algo',           // 中文必应结构
    'li[class*="b_algo"]', // 变体
    '.b_searchResult',     // 某些市场使用的类
    '[data-bm]',           // 带有 data-bm 属性的元素
    '#b_results li',       // b_results 容器内的 li
    '#b_content li',       // b_content 容器内的 li
  ];

  for (const selector of selectors) {
    const $items = $(selector);
    if ($items.length > 0) {
      $items.each((index, element) => {
        try {
          const $element = $(element);

          // 尝试多种方式提取标题和链接
          let $titleLink = $element.find('h2 a');
          if ($titleLink.length === 0) {
            $titleLink = $element.find('h3 a');
          }
          if ($titleLink.length === 0) {
            $titleLink = $element.find('a[href]').filter(function() {
              // 查找包含实际内容的链接（不是导航链接）
              const href = $(this).attr('href') || '';
              return href.startsWith('http') && !href.includes('bing.com');
            }).first();
          }

          const title = $titleLink.text().trim();
          let url = $titleLink.attr('href') || '';

          // 如果是 Bing 重定向链接，提取真实 URL
          if (url.includes('bing.com/ck/a') || url.includes('bing.com/ck/')) {
            url = extractRealUrlFromBingRedirect(url);
          }

          // 如果没有找到有效链接，跳过
          if (!url || url.includes('javascript:') || url.startsWith('https://www.bing.com/')) {
            return;
          }

          // 尝试多种方式提取摘要
          let snippet = '';
          const $caption = $element.find('.b_caption p');
          if ($caption.length > 0) {
            snippet = $caption.first().text().trim();
          }
          if (!snippet) {
            snippet = $element.find('p').first().text().trim();
          }

          // 提取显示URL
          let displayUrl = '';
          const $cite = $element.find('.b_attribution cite');
          if ($cite.length > 0) {
            displayUrl = $cite.first().text().trim();
          }
          if (!displayUrl) {
            const $attribution = $element.find('.b_attribution');
            if ($attribution.length > 0) {
              displayUrl = $attribution.first().text().trim();
            }
          }

          // 只添加有效的结果
          if (title && url) {
            results.push({
              uuid: randomUUID(),
              title,
              url,
              snippet: snippet || '',
              displayUrl: displayUrl || url,
            });
          }
        } catch (error) {
          // 忽略单个结果解析错误
        }
      });

      // 如果找到了结果，停止尝试其他选择器
      if (results.length > 0) {
        break;
      }
    }
  }
}

/**
 * 解析必应搜索结果HTML
 * @param html 必应搜索结果页面的HTML字符串
 * @param query 搜索查询词
 * @returns 解析后的搜索结果
 */
export function parseBingSearchResults(
  html: string,
  query: string
): BingSearchResponse {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // 首先尝试解析全局必应结果
  parseGlobalBingResults($, results);

  // 尝试获取结果总数（这个值可能不准确）
  let totalResults: number | undefined;
  const countText = $('.sb_count').text();
  const countMatch = countText.match(/[\d,]+/);
  if (countMatch) {
    totalResults = parseInt(countMatch[0].replace(/,/g, ''), 10);
  }

  return {
    query,
    results,
    totalResults,
  };
}
