# 前端SEO优化手段
## 一、 技术 SEO (Technical SEO)
### 优化页面速度 包括LCP INP等
### 移动端适配
### 结构化数据 例如json-jd
```code
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "极客美食林",
  "image": "https://example.com/photos/1x1/photo.jpg",
  "priceRange": "￥￥",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "南京路 88 号",
    "addressLocality": "上海",
    "postalCode": "200000",
    "addressCountry": "CN"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "250"
  }
}
</script>
```
### https
### 优化 Robots.txt 与 Sitemap 让爬虫知道爬取哪些url内容

## 内容SEO
### 内容结构化，语义化标签，图片/视频添加alt描述等
### 比较完整的html ssr 
### meta标签，title <meta name="description" content="这里是网页的简要总结...">
!-- 描述：150-160字符 -->
<meta name="description" content="页面描述，包含主要关键词">

<!-- 关键词（虽然Google已不重视，但其他搜索引擎可能使用） -->
<meta name="keywords" content="关键词1, 关键词2">

<!-- 移动端优化 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- 规范链接 -->
<link rel="canonical" href="https://example.com/page">
