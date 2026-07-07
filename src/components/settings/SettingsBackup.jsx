// src/components/settings/SettingsBackup.jsx
// 設定備份:匯出全部設定為 JSON 檔 / 從檔案全量還原。
// 純邏輯在 utils/settingsBackup.js(可單測);本元件只負責 chrome.storage 讀寫、
// 檔案下載/選擇與確認流程。格式契約見 specs/2026-07-07-settings-backup-design.md。
import { useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { buildStorageDefaults } from "../../config/settingsSchema";
import { buildSettingsExport, parseSettingsImport } from "../../utils/settingsBackup";

const buildExportFileName = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `NHITW_settings_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.json`;
};

const SettingsBackup = () => {
  const fileInputRef = useRef(null);
  // { severity: 'success' | 'warning' | 'error', text: string } | null
  const [status, setStatus] = useState(null);
  // parseSettingsImport 的 ok 結果;非 null 時顯示全量覆蓋確認 dialog
  const [pendingImport, setPendingImport] = useState(null);

  const handleExport = () => {
    chrome.storage.sync.get(buildStorageDefaults(), (items) => {
      if (chrome.runtime.lastError) {
        setStatus({ severity: "error", text: `讀取設定失敗:${chrome.runtime.lastError.message}` });
        return;
      }
      const exportData = buildSettingsExport(items, new Date().toISOString());
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus({ severity: "success", text: "設定已匯出" });
    });
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 清空以便重選同一檔案
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let json;
      try {
        json = JSON.parse(reader.result);
      } catch {
        setStatus({ severity: "error", text: "檔案不是有效的 JSON" });
        return;
      }
      const result = parseSettingsImport(json);
      if (!result.ok) {
        setStatus({ severity: "error", text: result.error });
        return;
      }
      setStatus(null);
      setPendingImport(result);
    };
    reader.onerror = () => setStatus({ severity: "error", text: "讀取檔案失敗" });
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const { settings, warnings } = pendingImport;
    setPendingImport(null);
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        setStatus({ severity: "error", text: `寫入設定失敗:${chrome.runtime.lastError.message}` });
        return;
      }
      // popup 各設定區塊只在 mount 時讀 storage,匯入後需重開視窗才會顯示新值;
      // 頁面端由 settingsManager 的 storage.onChanged 自動刷新。
      const reopenHint = "畫面上各區塊的顯示需重新開啟本視窗才會更新";
      setStatus(
        warnings.length > 0
          ? { severity: "warning", text: `設定已匯入(${warnings.join(";")})。${reopenHint}` }
          : { severity: "success", text: `設定已匯入。${reopenHint}` }
      );
    });
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="settings-backup-content"
        id="settings-backup-header"
      >
        <SettingsBackupRestoreIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography>設定備份</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          將全部設定匯出成 JSON 檔備份,或從備份檔完整還原(檔案未包含的項目會重設為預設值)。
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            匯出設定
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            匯入設定
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
        </Box>
        {status && (
          <Alert severity={status.severity} onClose={() => setStatus(null)}>
            {status.text}
          </Alert>
        )}
        <Dialog open={pendingImport !== null} onClose={() => setPendingImport(null)}>
          <DialogTitle>匯入設定?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              將以檔案內容完整覆蓋所有設定;檔案未包含的項目會重設為預設值。
              {pendingImport?.warnings?.length > 0 && (
                <>
                  <br />
                  注意:{pendingImport.warnings.join(";")}。
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingImport(null)}>取消</Button>
            <Button variant="contained" onClick={handleConfirmImport}>
              確定匯入
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default SettingsBackup;
