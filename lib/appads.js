// lib/appads.js
// Danh sách app affiliate (quản lý bằng file tĩnh)
const affiliateApps = [
  {
    id: "aff1",
    name: "Shopee",
    author: "Đối tác",
    icon_url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Shopee_logo.svg",
    affiliate_url: "https://go.accesstrade.vn/deep_link/shopee?aff_id=xxxx",
    payout_label: "CPI",
    category_slug: "shopping",
  },
  {
    id: "aff2",
    name: "Tiki",
    author: "Đối tác",
    icon_url: "https://salt.tikicdn.com/assets/img/icon.png",
    affiliate_url: "https://go.accesstrade.vn/deep_link/tiki?aff_id=xxxx",
    payout_label: "8% CPS",
    category_slug: "shopping",
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