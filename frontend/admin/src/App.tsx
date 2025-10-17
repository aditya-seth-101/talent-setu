import { useState } from "react";
import "./App.css";
import { CourseOutlineDashboard } from "./components/CourseOutlineDashboard";
import { RecruitmentDashboard } from "./components/RecruitmentDashboard";
import { TechnologyDirectoryDashboard } from "./components/TechnologyDirectoryDashboard";

type Tab = "outlines" | "recruitment" | "technology";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "outlines", label: "Outline review" },
  { id: "recruitment", label: "Talent search" },
  { id: "technology", label: "Technology approvals" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("outlines");

  return (
    <div className="app-shell">
      <nav className="tab-bar" aria-label="Admin sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tab-button"
            data-active={tab.id === activeTab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "outlines" && <CourseOutlineDashboard />}
      {activeTab === "recruitment" && <RecruitmentDashboard />}
      {activeTab === "technology" && <TechnologyDirectoryDashboard />}
    </div>
  );
}

export default App;
