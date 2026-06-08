import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Divider,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  CloudUpload as UploadIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface ShareInfo {
  username: string;
  email: string;
  permission: string;
}

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username: currentUser } = useAuth();

  const [documentTitle, setDocumentTitle] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [permission, setPermission] = useState<'READ' | 'WRITE'>('READ');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Share Dialog States
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [sharePermission, setSharePermission] = useState('READ');
  
  // Feedback Snackbar
  const [feedback, setFeedback] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // File Upload Ref
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (message: string, severity: 'success' | 'error') => {
    setFeedback({ message, severity });
  };

  // 1. Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: '',
  });

  // 2. Fetch Document Details
  const fetchDocument = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/documents/${id}`);
      const doc = response.data.document;
      const perm = response.data.permission;
      
      setDocumentTitle(doc.title);
      setOwnerUsername(doc.owner.username);
      setPermission(perm);

      if (editor) {
        editor.commands.setContent(doc.content || '');
        editor.setEditable(perm === 'WRITE');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to fetch document.';
      showFeedback(msg, 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Fetch document when editor and ID are ready
  useEffect(() => {
    if (editor && id) {
      fetchDocument();
    }
  }, [id, editor]);

  // 3. Save Document Action
  const handleSave = async () => {
    if (!editor || permission !== 'WRITE') return;
    
    setSaving(true);
    try {
      await axios.put(`/api/documents/${id}`, {
        title: documentTitle,
        content: editor.getHTML(),
      });
      showFeedback('Document saved successfully.', 'success');
    } catch (err: any) {
      showFeedback('Failed to save document.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Autosave setup (every 20 seconds)
  useEffect(() => {
    if (permission !== 'WRITE' || !editor) return;

    const interval = setInterval(() => {
      handleSave();
    }, 20000);

    return () => clearInterval(interval);
  }, [documentTitle, editor, permission]);

  // 4. Sharing Handlers
  const fetchShares = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}/shares`);
      setShares(response.data || []);
    } catch (err) {
      showFeedback('Failed to load sharing details.', 'error');
    }
  };

  const handleOpenShare = () => {
    if (ownerUsername !== currentUser) {
      showFeedback('Only the owner can manage sharing settings.', 'error');
      return;
    }
    fetchShares();
    setShareDialogOpen(true);
  };

  const handleAddShare = async () => {
    if (!targetUsername.trim()) {
      showFeedback('Username is required.', 'error');
      return;
    }

    try {
      await axios.post(`/api/documents/${id}/share`, {
        username: targetUsername,
        permission: sharePermission,
      });
      showFeedback(`Shared with ${targetUsername} successfully.`, 'success');
      setTargetUsername('');
      fetchShares();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to share document.';
      showFeedback(msg, 'error');
    }
  };

  const handleRemoveShare = async (sharedUser: string) => {
    try {
      await axios.delete(`/api/documents/${id}/share`, {
        params: { username: sharedUser },
      });
      showFeedback(`Removed sharing for ${sharedUser}.`, 'success');
      fetchShares();
    } catch (err: any) {
      showFeedback('Failed to remove share privileges.', 'error');
    }
  };

  // 5. In-editor Text Ingestion (File Import)
  const handleAppendFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'txt' && extension !== 'md') {
      showFeedback('Only .txt and .md files are supported.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    try {
      const response = await axios.post(`/api/documents/${id}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const parsedHtml = response.data.content;
      if (editor) {
        // Append parsed HTML structure at the end of the editor
        editor.commands.insertContent(parsedHtml);
        showFeedback('Content imported successfully!', 'success');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to import file content.';
      showFeedback(errMsg, 'error');
    } finally {
      setSaving(false);
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b0f19', color: '#f8fafc', gap: 2 }}>
        <CircularProgress size={60} sx={{ color: '#818cf8' }} />
        <Typography>Loading Editor...</Typography>
      </Box>
    );
  }

  const isOwner = ownerUsername === currentUser;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0f19', color: '#f8fafc', pb: 8 }}>
      {/* Editor Top Bar */}
      <AppBar
        position="sticky"
        sx={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          {/* Back Action */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
              <BackIcon />
            </IconButton>
            
            {/* Title Editing field */}
            <TextField
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              disabled={permission !== 'WRITE'}
              variant="standard"
              placeholder="Untitled Document"
              sx={{
                '& .MuiInputBase-input': {
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  width: 'fit-content',
                  maxWidth: '250px',
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  '&:focus': {
                    bgcolor: 'rgba(255, 255, 255, 0.06)',
                  },
                },
                '& .MuiInput-root:before': { display: 'none' },
                '& .MuiInput-root:after': { display: 'none' },
              }}
            />
            
            {/* Permission status tags */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              {isOwner ? (
                <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold', px: 1.5, py: 0.5, borderRadius: 1.5 }}>
                  Owner
                </Box>
              ) : (
                <Box sx={{ bgcolor: permission === 'WRITE' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: permission === 'WRITE' ? '#c084fc' : '#f87171', fontSize: '0.75rem', fontWeight: 'bold', px: 1.5, py: 0.5, borderRadius: 1.5 }}>
                  {permission === 'WRITE' ? 'Shared (Editor)' : 'Shared (Read Only)'}
                </Box>
              )}
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {permission === 'WRITE' && (
              <>
                <input
                  type="file"
                  ref={appendFileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAppendFile}
                  accept=".txt,.md"
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon />}
                  onClick={() => appendFileInputRef.current?.click()}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#818cf8',
                      background: 'rgba(129, 140, 248, 0.08)',
                      color: '#ffffff',
                    },
                  }}
                >
                  Import File
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    borderRadius: 2,
                    px: 2.5,
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}

            {isOwner && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShareIcon />}
                onClick={handleOpenShare}
                sx={{
                  borderColor: '#818cf8',
                  color: '#818cf8',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#c084fc',
                    background: 'rgba(168, 85, 247, 0.08)',
                    color: '#c084fc',
                  },
                }}
              >
                Share
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Editor Main Section */}
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Editor Toolbar (Only for editors) */}
        {editor && permission === 'WRITE' && (
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              p: 1,
              mb: 2,
              bgcolor: '#1e293b',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Tooltip title="Bold">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                sx={{
                  color: editor.isActive('bold') ? '#818cf8' : '#94a3b8',
                  bgcolor: editor.isActive('bold') ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <BoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Italic">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                sx={{
                  color: editor.isActive('italic') ? '#818cf8' : '#94a3b8',
                  bgcolor: editor.isActive('italic') ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <ItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Underline">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                sx={{
                  color: editor.isActive('underline') ? '#818cf8' : '#94a3b8',
                  bgcolor: editor.isActive('underline') ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <UnderlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <Button
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              sx={{
                minWidth: '36px',
                color: editor.isActive('heading', { level: 1 }) ? '#818cf8' : '#94a3b8',
                bgcolor: editor.isActive('heading', { level: 1 }) ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                borderRadius: 1.5,
                fontWeight: 800,
                textTransform: 'none',
              }}
            >
              H1
            </Button>

            <Button
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              sx={{
                minWidth: '36px',
                color: editor.isActive('heading', { level: 2 }) ? '#818cf8' : '#94a3b8',
                bgcolor: editor.isActive('heading', { level: 2 }) ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                borderRadius: 1.5,
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              H2
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <Tooltip title="Bullet List">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                sx={{
                  color: editor.isActive('bulletList') ? '#818cf8' : '#94a3b8',
                  bgcolor: editor.isActive('bulletList') ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <BulletListIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Numbered List">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                sx={{
                  color: editor.isActive('orderedList') ? '#818cf8' : '#94a3b8',
                  bgcolor: editor.isActive('orderedList') ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <NumberedListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        )}

        {/* Editor Paper Canvas */}
        <Paper
          elevation={12}
          sx={{
            minHeight: '600px',
            bgcolor: '#1e293b',
            color: '#f1f5f9',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.06)',
            p: 4,
            '& .ProseMirror': {
              minHeight: '530px',
              outline: 'none',
            },
          }}
        >
          {editor && <EditorContent editor={editor} />}
        </Paper>
      </Container>

      {/* Share Management Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Share Document</DialogTitle>
        <DialogContent>
          {/* Share configuration row */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Grant other accounts access to view or modify this document.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                label="Username"
                placeholder="Enter username"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                sx={{
                  flexGrow: 1,
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputBase-input': { color: '#ffffff' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                    '&:hover fieldset': { borderColor: '#818cf8' },
                    '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="permission-select-label" style={{ color: '#94a3b8' }}>Access</InputLabel>
                <Select
                  labelId="permission-select-label"
                  value={sharePermission}
                  label="Access"
                  onChange={(e) => setSharePermission(e.target.value)}
                  sx={{
                    color: '#ffffff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#818cf8' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#c084fc' },
                    '.MuiSvgIcon-root': { color: '#94a3b8' },
                  }}
                >
                  <MenuItem value="READ">Read Only</MenuItem>
                  <MenuItem value="WRITE">Can Edit</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddShare}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  textTransform: 'none',
                  fontWeight: 'bold',
                  height: 40,
                  px: 3,
                  borderRadius: 2,
                }}
              >
                Share
              </Button>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 2 }} />

          {/* List of active shares */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0', mb: 1 }}>
            Shared Users
          </Typography>
          
          {shares.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', py: 2, textAlign: 'center' }}>
              This document is not currently shared with anyone.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {shares.map((share, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 600, color: '#f1f5f9' }}>{share.username}</Typography>}
                    secondary={<Typography variant="body2" sx={{ color: '#64748b' }}>{share.email}</Typography>}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 5 }}>
                    <Box
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: share.permission === 'WRITE' ? '#c084fc' : '#818cf8',
                        bgcolor: share.permission === 'WRITE' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(129, 140, 248, 0.12)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                      }}
                    >
                      {share.permission === 'WRITE' ? 'Editor' : 'Reader'}
                    </Box>
                  </Box>
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveShare(share.username)} sx={{ color: '#94a3b8', '&:hover': { color: '#f43f5e' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShareDialogOpen(false)} variant="outlined" sx={{ color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.12)', textTransform: 'none', borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Alert */}
      <Snackbar
        open={!!feedback}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditorPage;
