const contentCard = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
const adCard = contentCard;

const AdLabel = () => (
  <div
    className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold bg-white dark:bg-gray-800"
    style={{ zIndex: 1 }}
  >
    Quảng cáo
  </div>
);

const AdWrapper = ({ children }) => (
  <div className="relative">
    <AdLabel />
    <div className={`${adCard} pt-4`}>
      {children}
    </div>
  </div>
);