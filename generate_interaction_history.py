#!/usr/bin/env python3
"""
CPDM 專案互動歷史報告產生器
自動掃描 Antigravity 對話記錄並產生 project_interaction_history.md
"""

import os
import json
import struct
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import re

# ====== 配置區 ======
ANTIGRAVITY_BASE = Path.home() / ".gemini" / "antigravity"
CONVERSATIONS_DIR = ANTIGRAVITY_BASE / "conversations"
BRAIN_DIR = ANTIGRAVITY_BASE / "brain"
OUTPUT_DIR = Path.home() / "Documents" / "Html" / "新增資料夾" / "AI專案管理"

# ====== 對話摘要資料庫 (從系統取得或手動維護) ======
# 由於 .pb 檔案是 Protobuf 二進制格式,我們使用 metadata.json 和目錄結構來推斷
CONVERSATION_SUMMARIES = {
    "b3615b63-3c6f-48b1-b25a-86884f204649": {
        "title": "SQLite 穩定性與修復",
        "project": "福至心靈籤",
        "category": "DEBUG",
        "hours": 3.0,
        "summary": "解決 SQLITE_MISUSE 和 SQLITE_NOMEM 錯誤"
    },
    "a2f3745b-9c75-4b84-b201-d238ae25b16c": {
        "title": "本地 LM Studio 整合",
        "project": "福至心靈籤",
        "category": "架構變更",
        "hours": 0.4,
        "summary": "整合 LM Studio 替代 Gemini API"
    },
    "771a2bfa-9c6d-4133-b9ee-725885ee45d6": {
        "title": "捲軸版面美學優化",
        "project": "福至心靈籤",
        "category": "UI 調整",
        "hours": 2.0,
        "summary": "優化鳳凰牌匾大小、位置與互動效果"
    },
    "bf5a9afd-c25c-4535-b425-70c900b37a74": {
        "title": "LM Studio JSON 解析修復",
        "project": "福至心靈籤",
        "category": "DEBUG",
        "hours": 4.0,
        "summary": "修正 JSON 格式錯誤與控制字元問題"
    },
    "d1b790ad-8b63-43aa-b47e-34b7fb67efc3": {
        "title": "歷史記錄顯示增強",
        "project": "福至心靈籤",
        "category": "UI 調整",
        "hours": 3.5,
        "summary": "實作可摺疊記錄、月份篩選、時間戳記顯示"
    },
    "9eb84981-2b06-4168-856e-827d06ff1035": {
        "title": "Gemini API 金鑰除錯",
        "project": "福至心靈籤",
        "category": "DEBUG",
        "hours": 1.5,
        "summary": "驗證 API 金鑰有效性與權限"
    },
    "f62a0ee0-d82b-4475-a603-6a572354cd49": {
        "title": "Supabase Schema 修復",
        "project": "福至心靈籤",
        "category": "架構變更",
        "hours": 6.0,
        "summary": "新增 user_id 欄位並設定 RLS 政策"
    },
    "7c6870ca-d1bd-4574-a1e5-952df7709e03": {
        "title": "GDDM/CPDM 方法論建立",
        "project": "AI專案管理",
        "category": "知識收集",
        "hours": 5.0,
        "summary": "建立 Gemini 驅動開發方法論與中心程式開發方法"
    },
    "c3b6572d-88d2-4298-a4ae-6feb9823bcaf": {
        "title": "專案歷史與未來分析",
        "project": "福至心靈籤",
        "category": "知識收集",
        "hours": 4.0,
        "summary": "分析專案互動歷史、工時統計與未來規劃"
    },
    "d2ffd144-6fc4-4d7d-b1d8-245a9f7f1095": {
        "title": "工程師協作檢查清單",
        "project": "AI專案管理",
        "category": "知識收集",
        "hours": 1.0,
        "summary": "建立工程師協作模板與檢查清單"
    }
}


def get_conversation_file_info(conv_id: str) -> dict:
    """取得對話檔案的基本資訊 (檔案大小、修改時間)"""
    pb_file = CONVERSATIONS_DIR / f"{conv_id}.pb"
    if pb_file.exists():
        stat = pb_file.stat()
        return {
            "size_bytes": stat.st_size,
            "modified_time": datetime.fromtimestamp(stat.st_mtime),
            "created_time": datetime.fromtimestamp(stat.st_ctime)
        }
    return None


def get_brain_artifacts(conv_id: str) -> list:
    """取得對話產生的 artifacts"""
    brain_folder = BRAIN_DIR / conv_id
    if brain_folder.exists():
        return [f.name for f in brain_folder.iterdir() if f.suffix == ".md"]
    return []


def estimate_hours_from_size(size_bytes: int) -> float:
    """根據對話檔案大小估算工時 (粗略估算)"""
    # 假設每 100KB 約代表 1 小時的對話
    return round(size_bytes / 100000, 1)


def categorize_by_keywords(title: str) -> str:
    """根據標題關鍵字自動分類"""
    title_lower = title.lower()
    if any(kw in title_lower for kw in ["fix", "bug", "error", "debug", "修復", "錯誤"]):
        return "🐛 DEBUG"
    if any(kw in title_lower for kw in ["ui", "css", "style", "view", "介面", "調整"]):
        return "🎨 UI 調整"
    if any(kw in title_lower for kw in ["refactor", "架構", "structure", "schema"]):
        return "🏗️ 架構變更"
    return "📚 知識收集"


def generate_report(project_filter: str = None, start_date: datetime = None, end_date: datetime = None) -> str:
    """產生完整的專案互動歷史報告"""
    
    # 收集所有對話資訊
    conversations = []
    for conv_id, meta in CONVERSATION_SUMMARIES.items():
        file_info = get_conversation_file_info(conv_id)
        if file_info:
            # 套用篩選條件
            if project_filter and meta.get("project") != project_filter:
                continue
            if start_date and file_info["modified_time"] < start_date:
                continue
            if end_date and file_info["modified_time"] > end_date:
                continue
                
            conversations.append({
                "id": conv_id,
                "title": meta.get("title", "未命名對話"),
                "project": meta.get("project", "未分類"),
                "category": meta.get("category", "其他"),
                "hours": meta.get("hours", estimate_hours_from_size(file_info["size_bytes"])),
                "summary": meta.get("summary", ""),
                "modified_time": file_info["modified_time"],
                "size_kb": round(file_info["size_bytes"] / 1024, 1),
                "artifacts": get_brain_artifacts(conv_id)
            })
    
    # 依時間排序
    conversations.sort(key=lambda x: x["modified_time"])
    
    # 統計資料
    total_hours = sum(c["hours"] for c in conversations)
    projects = defaultdict(list)
    categories = defaultdict(list)
    for c in conversations:
        projects[c["project"]].append(c)
        categories[c["category"]].append(c)
    
    # 產生 Markdown
    report = []
    report.append("# 專案互動歷史報告")
    report.append("")
    report.append(f"> **自動產生於**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"> **分析期間**: {conversations[0]['modified_time'].strftime('%Y-%m-%d') if conversations else 'N/A'} ~ {conversations[-1]['modified_time'].strftime('%Y-%m-%d') if conversations else 'N/A'}")
    report.append("")
    report.append("---")
    report.append("")
    
    # 總覽
    report.append("## 📊 統計總覽")
    report.append("")
    report.append("| 指標 | 數值 |")
    report.append("|------|------|")
    report.append(f"| 對話總數 | {len(conversations)} 個 |")
    report.append(f"| 總工時 | {total_hours:.1f} 小時 |")
    report.append(f"| 涉及專案 | {len(projects)} 個 |")
    report.append(f"| 分類數 | {len(categories)} 類 |")
    report.append("")
    
    # 專案分布
    report.append("### 專案分布")
    report.append("")
    for proj, convs in projects.items():
        hours = sum(c["hours"] for c in convs)
        report.append(f"- **{proj}**: {len(convs)} 次對話, {hours:.1f} 小時")
    report.append("")
    
    # 類別分布
    report.append("### 類別分布")
    report.append("")
    for cat, convs in categories.items():
        hours = sum(c["hours"] for c in convs)
        emoji = "🐛" if "DEBUG" in cat else "🎨" if "UI" in cat else "🏗️" if "架構" in cat else "📚"
        report.append(f"- {emoji} **{cat}**: {len(convs)} 項, {hours:.1f} 小時")
    report.append("")
    
    report.append("---")
    report.append("")
    
    # 詳細記錄
    report.append("## 📋 詳細互動記錄")
    report.append("")
    
    for i, conv in enumerate(conversations, 1):
        emoji = "🔷" if i % 2 == 0 else "🔹"
        report.append(f"### {emoji} {i}. {conv['title']}")
        report.append("")
        report.append(f"**對話 ID**: `{conv['id']}`  ")
        report.append(f"**所屬專案**: {conv['project']}  ")
        report.append(f"**分類**: {conv['category']}  ")
        report.append(f"**最後更新**: {conv['modified_time'].strftime('%Y-%m-%d %H:%M')}  ")
        report.append(f"**工時**: {conv['hours']:.1f} 小時  ")
        report.append(f"**檔案大小**: {conv['size_kb']} KB")
        report.append("")
        
        if conv["summary"]:
            report.append(f"**摘要**: {conv['summary']}")
            report.append("")
        
        if conv["artifacts"]:
            report.append("**產出 Artifacts**:")
            for artifact in conv["artifacts"]:
                report.append(f"- `{artifact}`")
            report.append("")
        
        report.append("---")
        report.append("")
    
    # 工時分布圖 (ASCII)
    report.append("## 📈 工時分布圖")
    report.append("")
    report.append("```")
    max_hours = max(c["hours"] for c in conversations) if conversations else 1
    for conv in conversations:
        bar_len = int((conv["hours"] / max_hours) * 30)
        bar = "█" * bar_len + "░" * (30 - bar_len)
        title = conv["title"][:20].ljust(20)
        report.append(f"{title} {bar} {conv['hours']:.1f}h")
    report.append("```")
    report.append("")
    
    # 結論
    report.append("---")
    report.append("")
    report.append("*此報告由 CPDM 專案互動歷史產生器自動生成*")
    
    return "\n".join(report)


def main():
    """主程式入口"""
    print("=" * 50)
    print("CPDM 專案互動歷史報告產生器")
    print("=" * 50)
    print()
    
    # 檢查目錄是否存在
    if not CONVERSATIONS_DIR.exists():
        print(f"❌ 找不到對話目錄: {CONVERSATIONS_DIR}")
        return
    
    print(f"📁 對話目錄: {CONVERSATIONS_DIR}")
    print(f"📁 Brain 目錄: {BRAIN_DIR}")
    print()
    
    # 產生報告
    report = generate_report()
    
    # 輸出到檔案
    output_file = OUTPUT_DIR / "project_interaction_history_auto.md"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"✅ 報告已產生: {output_file}")
    print()
    print("=" * 50)
    print("報告預覽 (前 50 行):")
    print("=" * 50)
    for line in report.split("\n")[:50]:
        print(line)


if __name__ == "__main__":
    main()
