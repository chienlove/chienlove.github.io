// components/admin/CertManagerAndSigner.js
import { useState } from "react";
import CertManager from "./CertManager";
import SignIPARequest from "./SignIPARequest";

export default function CertManagerAndSigner() {
  const [subTab, setSubTab] = useState("manage");

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          className={`flex-1 text-center px-4 py-3 font-medium transition-colors ${
            subTab === "manage"
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          }`}
          onClick={() => setSubTab("manage")}
        >
          🔐 Quản lý chứng chỉ
        </button>
        <button
          className={`flex-1 text-center px-4 py-3 font-medium transition-colors ${
            subTab === "sign"
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          }`}
          onClick={() => setSubTab("sign")}
        >
          🚀 Gửi yêu cầu ký IPA
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {subTab === "manage" && <CertManager />}
        {subTab === "sign" && <SignIPARequest />}
      </div>
    </div>
  );
}