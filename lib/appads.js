// lib/appads.js
// Danh sách app affiliate (quản lý bằng file tĩnh)
const affiliateApps = [
  {
    id: "aff1",
    name: "LioBank",
    author: "Đối tác",
    icon_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/33/e1/69/33e1698c-d928-3a36-c32c-73b68bdc2598/AppIconLiobank-0-0-1x_U007emarketing-0-6-0-sRGB-85-220.png/512x512bb.jpg",
    affiliate_url: "https://go.isclix.com/deep_link/v6/5097018264529380305/6623836176178490557?sub1=104888&sub4=oneatapp&url_enc=aHR0cHM6Ly9saW9iYW5rLmdvLmxpbms%2FYWRqX3Q9MWpyeG56eGkmYWRqX2NhbXBhaWduPUFjY2VzdHJhZGVfVk5fMSZhZGpfYWRncm91cD1BY2Nlc3RyYWRlX1ZOXzEmYWRqX2NyZWF0aXZlPUFjY2VzdHJhZGVfVk5fMSZhZGpfaWRmYT17aWRmYXx8Z3BzX2FkaWR9JmFkal9jbGlja19pZD17dHJhY2tpbmctY2xpY2tpZC12YWx1ZX0mYWRqX2dwc19hZGlkPXthYWlkfSZhZGpfaW5zdGFsbF9jYWxsYmFjaz1odHRwczovL3RyYWNrLmFjY2Vzc3RyYWRlLnZuL3RyYWNrL2FkanVzdD9jYW1wYWlnbl9pZD17Y2FtcGFpZ25faWR9JnJlc3VsdF9pZD0zMCZhY3Rpb249aW5zdGFsbF9jYWxsYmFjayZ0cmFja2luZ19pZD17dHJhY2tpbmctY2xpY2tpZC12YWx1ZX0maWRmYT17aWRmYXx8Z3BzX2FkaWR9JmlkZW50aWZpZXI9e2FkaWR9",
    payout_label: "CPI",
    category_slug: "testflight",
  },
  {
    id: "aff2",
    name: "Tandoo - Live video chat",
    author: "Đối tác",
    icon_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/e9/65/70/e96570ff-e9f2-8213-7af2-1d6198630081/AppIcon-0-0-1x_U007emarketing-0-6-0-sRGB-85-220.png/512x512bb.jpg",
    affiliate_url: "https://go.accesstrade.vn/deep_link/tiki?aff_id=xxxx",
    payout_label: "8% CPS",
    category_slug: "testflight",
  },
  {
    id: "aff3",
    name: "Lazada",
    author: "Đối tác",
    icon_url: "https://lzd-img-global.slatic.net/g/tps/imgextra/i3/O1CN01Lazada.png",
    affiliate_url: "https://go.accesstrade.vn/deep_link/lazada?aff_id=xxxx",
    payout_label: "10% CPS",
    category_slug: "shopping",
  },
];

export default affiliateApps;