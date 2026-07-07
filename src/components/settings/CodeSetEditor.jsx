// src/components/settings/CodeSetEditor.jsx
// 通用代碼集編輯器(DOC/07 方向五 pilot):依 codeSets.js 宣告渲染 list shape。
// temp state(workingList)→ 保存時 diffToOverlay 寫回;取消不落地。
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Checkbox, IconButton, TextField, Box, Divider, Collapse, Alert,
} from '@mui/material';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

import { getCodeSet } from '../../config/codeSets';
import { resolveCodeSet, diffToOverlay } from '../../utils/codeSetResolver';
import { runCodeSetMigrations } from '../../utils/codeSetMigration';

const notifyPage = (setting, value) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'settingChanged',
        settingType: 'overview',
        setting,
        value,
      });
    }
  });
};

const CodeSetEditor = ({ codeSetId, open, onClose }) => {
  const codeSet = getCodeSet(codeSetId);
  const [workingList, setWorkingList] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open || !codeSet) return;
    runCodeSetMigrations().then(() => {
      chrome.storage.sync.get({ [codeSet.storageKey]: null }, (items) => {
        setWorkingList(resolveCodeSet(codeSet.builtin, items[codeSet.storageKey]));
      });
    });
    setShowPicker(false);
    setFilter('');
    setEditingId(null);
    setConfirmReset(false);
  }, [open, codeSetId]);

  if (!codeSet) return null;

  const builtinIds = new Set(codeSet.builtin.map(i => i.id));
  const inListIds = new Set(workingList.map(i => i.id));
  const availableCatalog = codeSet.catalog.filter(e =>
    !inListIds.has(`catalog:${e.code}`) &&
    (filter === '' || e.label.toLowerCase().includes(filter.toLowerCase()) || e.code.includes(filter))
  );
  const availablePresets = codeSet.aliasPresets.filter(p => !inListIds.has(p.id));

  const toggle = (id) =>
    setWorkingList(list => list.map(i => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  const move = (index, delta) =>
    setWorkingList(list => {
      const j = index + delta;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  const removeItem = (id) => setWorkingList(list => list.filter(i => i.id !== id));
  const addCatalogEntry = (entry) =>
    setWorkingList(list => [...list, {
      id: `catalog:${entry.code}`, label: entry.label, codes: [entry.code], enabled: true, order: list.length,
    }]);
  const addAliasPreset = (preset) =>
    setWorkingList(list => [...list, { ...preset, codes: [...preset.codes], enabled: true, order: list.length }]);

  const startRename = (item) => { setEditingId(item.id); setEditingLabel(item.label); };
  const commitRename = () => {
    if (editingId && editingLabel.trim() !== '') {
      const label = editingLabel.trim();
      setWorkingList(list => list.map(i => (i.id === editingId ? { ...i, label } : i)));
    }
    setEditingId(null);
  };

  const handleSave = () => {
    const overlay = diffToOverlay(codeSet.builtin, workingList);
    chrome.storage.sync.set({ [codeSet.storageKey]: overlay }, () => {
      notifyPage(codeSet.storageKey, overlay);
      onClose();
    });
  };
  const handleResetAll = () => {
    chrome.storage.sync.set({ [codeSet.storageKey]: null }, () => {
      notifyPage(codeSet.storageKey, null);
      onClose();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{codeSet.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          勾選要顯示的項目,箭頭調整順序;點項目名稱可改名。「加入的項目」可刪除,內建項目僅能停用。
        </Typography>
        <List dense sx={{ width: '100%' }}>
          {workingList.map((item, index) => (
            <ListItem key={item.id} divider>
              <ListItemIcon>
                <Checkbox edge="start" checked={item.enabled} onChange={() => toggle(item.id)} />
              </ListItemIcon>
              {editingId === item.id ? (
                <TextField
                  size="small" autoFocus value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); }}
                />
              ) : (
                <ListItemText
                  primary={item.label}
                  secondary={item.codes.join(', ')}
                  onClick={() => startRename(item)}
                  sx={{ cursor: 'pointer' }}
                />
              )}
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowCircleUpIcon fontSize="small" />
                </IconButton>
                <IconButton edge="end" size="small" onClick={() => move(index, 1)} disabled={index === workingList.length - 1}>
                  <ArrowCircleDownIcon fontSize="small" />
                </IconButton>
                {!builtinIds.has(item.id) && (
                  <IconButton edge="end" size="small" color="error" onClick={() => removeItem(item.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Button startIcon={<PlaylistAddIcon />} onClick={() => setShowPicker(v => !v)} sx={{ mt: 1 }}>
          從常用項目加入
        </Button>
        <Collapse in={showPicker}>
          <Box sx={{ mt: 1 }}>
            <TextField
              size="small" fullWidth placeholder="輸入名稱或代碼過濾"
              value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ mb: 1 }}
            />
            {availablePresets.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">一對多代碼組(跨院所 alias)</Typography>
                <List dense>
                  {availablePresets.map(p => (
                    <ListItem key={p.id} onClick={() => addAliasPreset(p)} sx={{ cursor: 'pointer' }}>
                      <ListItemText primary={p.label} secondary={p.codes.join(', ')} />
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}
            <List dense>
              {availableCatalog.map(e => (
                <ListItem key={e.code} onClick={() => addCatalogEntry(e)} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary={e.label} secondary={e.code} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>

        {confirmReset && (
          <Alert
            severity="warning" sx={{ mt: 1 }}
            action={<Button color="inherit" size="small" onClick={handleResetAll}>確認還原</Button>}
          >
            將清除此清單的全部自訂(啟停、排序、改名、加入項),還原為出廠預設。
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button color="secondary" sx={{ mr: 'auto' }} onClick={() => setConfirmReset(true)}>
          全部還原預設
        </Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeSetEditor;
