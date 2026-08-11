// Filter options for dashboard controls

export const ranges = [
  { id: "all", label: "ทั้งหมด", short: "ทั้งหมด", factor: 1 },
  { id: "1m", label: "1 เดือนล่าสุด", short: "1 เดือน", factor: 1 },
  { id: "3m", label: "3 เดือนล่าสุด", short: "3 เดือน", factor: 1 },
  { id: "6m", label: "6 เดือนล่าสุด", short: "6 เดือน", factor: 1 },
  { id: "this_year", label: "ปีนี้", short: "ปีนี้", factor: 1 },
];

export const sources = [
  { id: "all", label: "แหล่งที่มาทั้งหมด", factor: 1 },
  { id: "statement", label: "Statement ที่นำเข้า", factor: 1 },
];

export const categories = [
  { id: "all", label: "ทุกหมวดหมู่" },
  { id: "income", label: "รายได้ประจำ" },
  { id: "food", label: "อาหารและเครื่องดื่ม" },
  { id: "housing", label: "ที่อยู่อาศัย" },
  { id: "transport", label: "การเดินทาง" },
  { id: "utility", label: "สาธารณูปโภค" },
  { id: "shopping", label: "ช้อปปิ้ง" },
  { id: "health", label: "สุขภาพ" },
  { id: "entertainment", label: "ความบันเทิง" },
  { id: "other", label: "อื่น ๆ" },
];

export const navItems = [
  { id: "overview", label: "ภาพรวมการเงิน", icon: "Home" },
  { id: "accounts", label: "บัญชีและกระเป๋า", icon: "WalletCards" },
  { id: "transactions", label: "รายการธุรกรรม", icon: "FileSpreadsheet" },
  { id: "budgets", label: "งบประมาณ", icon: "Target" },
  { id: "goals", label: "เป้าหมายออม", icon: "TrendingUp" },
  { id: "reports", label: "รายงาน", icon: "BarChart3" },
  { id: "insights", label: "AI Insights", icon: "Sparkles" },
  { id: "settings", label: "ตั้งค่า", icon: "Settings" },
];
