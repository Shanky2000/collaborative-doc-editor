import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as RenameIcon,
  ExitToApp as LogoutIcon,
  Description as DocIcon,
  People as SharedIcon,
  AccountCircle as UserIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Document {
  id: number;
  title: string;
  content: string;
  owner: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const Dashboard: React.FC = () => {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const [ownedDocs, setOwnedDocs] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<Document[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dialog & Notification States
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // File Upload Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/documents');
      setOwnedDocs(response.data.owned || []);
      setSharedDocs(response.data.shared || []);
    } catch (err: any) {
      showFeedback('Failed to fetch documents.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showFeedback = (message: string, severity: 'success' | 'error') => {
    setFeedback({ message, severity });
  };

  const handleCreateDocument = async () => {
    setActionLoading(true);
    try {
      const response = await axios.post('/api/documents', {
        title: 'Untitled Document',
        content: '<p>Start writing here...</p>',
      });
      showFeedback('Document created successfully!', 'success');
      navigate(`/documents/${response.data.id}`);
    } catch (err: any) {
      showFeedback('Failed to create document.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`/api/documents/${id}`);
      showFeedback('Document deleted successfully.', 'success');
      fetchDocuments();
    } catch (err: any) {
      showFeedback('Failed to delete document.', 'error');
    }
  };

  const handleRenameClick = (doc: Document) => {
    setSelectedDoc(doc);
    setNewTitle(doc.title);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!newTitle.trim()) {
      showFeedback('Title cannot be empty.', 'error');
      return;
    }
    if (!selectedDoc) return;

    setActionLoading(true);
    try {
      await axios.put(`/api/documents/${selectedDoc.id}`, {
        title: newTitle,
      });
      showFeedback('Document renamed successfully.', 'success');
      setRenameDialogOpen(false);
      fetchDocuments();
    } catch (err: any) {
      showFeedback('Failed to rename document.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'txt' && extension !== 'md') {
      showFeedback('Invalid file type. Only .txt and .md files are supported.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setActionLoading(true);
    try {
      const response = await axios.post('/api/documents/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showFeedback('File imported successfully!', 'success');
      navigate(`/documents/${response.data.id}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to import file.';
      showFeedback(errMsg, 'error');
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0f19', color: '#f8fafc' }}>
      {/* App Bar Header */}
      <AppBar
        position="static"
        sx={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifySelf: 'stretch', justifyContent: 'space-between' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(to right, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            CollabDoc
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserIcon sx={{ color: '#818cf8' }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#e2e8f0' }}>
                {username}
              </Typography>
            </Box>
            <Divider orientation="vertical" variant="middle" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
            <Tooltip title="Log Out">
              <IconButton onClick={handleLogout} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Dash Controls Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            mb: 5,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.025em', mb: 1 }}>
              Welcome back, {username}
            </Typography>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
              Create a document, import content, or work on shared projects.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".txt,.md"
            />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={actionLoading}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                borderRadius: 2,
                px: 2.5,
                py: 1.2,
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#818cf8',
                  background: 'rgba(129, 140, 248, 0.08)',
                },
              }}
            >
              Import File (.txt/.md)
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateDocument}
              disabled={actionLoading}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                borderRadius: 2,
                px: 3,
                py: 1.2,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                  boxShadow: '0 6px 20px 0 rgba(99, 102, 241, 0.5)',
                },
              }}
            >
              New Document
            </Button>
          </Box>
        </Box>

        {/* Action Loader */}
        {actionLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <CircularProgress size={32} color="secondary" />
          </Box>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.08)', mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(to right, #818cf8, #c084fc)',
                height: 3,
              },
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1.05rem',
                color: '#94a3b8',
                '&.Mui-selected': {
                  color: '#ffffff',
                },
              },
            }}
          >
            <Tab label={`My Documents (${ownedDocs.length})`} />
            <Tab label={`Shared with Me (${sharedDocs.length})`} />
          </Tabs>
        </Box>

        {/* Tab Content Rendering */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
            <CircularProgress size={50} thickness={4} sx={{ color: '#818cf8' }} />
            <Typography sx={{ color: '#94a3b8' }}>Loading documents...</Typography>
          </Box>
        ) : (
          <Box>
            {tabValue === 0 && (
              <Grid container spacing={3}>
                {ownedDocs.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        py: 8,
                        textAlign: 'center',
                        bgcolor: 'rgba(30, 41, 59, 0.3)',
                        borderRadius: 4,
                        border: '2px dashed rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <DocIcon sx={{ fontSize: 60, color: '#475569', mb: 2 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#cbd5e1', mb: 1 }}>
                        No Documents Yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                        Create a new document or import a text file to get started.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleCreateDocument}
                        sx={{
                          bgcolor: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.25)' },
                          textTransform: 'none',
                          fontWeight: 'bold',
                        }}
                      >
                        Create Document
                      </Button>
                    </Box>
                  </Grid>
                ) : (
                  ownedDocs.map((doc) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 3,
                          transition: 'transform 0.2s, border-color 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: 'rgba(129, 140, 248, 0.4)',
                            background: 'rgba(30, 41, 59, 0.6)',
                          },
                        }}
                      >
                        <CardContent
                          sx={{ flexGrow: 1, cursor: 'pointer', p: 3 }}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <DocIcon sx={{ color: '#818cf8' }} />
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#ffffff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {doc.title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#94a3b8',
                              mb: 2,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              minHeight: '3.6em',
                            }}
                            dangerouslySetInnerHTML={{
                              __html: doc.content
                                ? doc.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...'
                                : 'No content...',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Updated: {formatDate(doc.updatedAt)}
                          </Typography>
                        </CardContent>
                        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Rename">
                              <IconButton size="small" onClick={() => handleRenameClick(doc)} sx={{ color: '#94a3b8', '&:hover': { color: '#818cf8' } }}>
                                <RenameIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => handleDeleteDocument(doc.id)} sx={{ color: '#94a3b8', '&:hover': { color: '#f43f5e' } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Owned by you">
                              <Box
                                sx={{
                                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1.5,
                                }}
                              >
                                Owner
                              </Box>
                            </Tooltip>
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            )}

            {tabValue === 1 && (
              <Grid container spacing={3}>
                {sharedDocs.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        py: 8,
                        textAlign: 'center',
                        bgcolor: 'rgba(30, 41, 59, 0.3)',
                        borderRadius: 4,
                        border: '2px dashed rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <SharedIcon sx={{ fontSize: 60, color: '#475569', mb: 2 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#cbd5e1', mb: 1 }}>
                        No Shared Documents
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Documents shared with you by other users will appear here.
                      </Typography>
                    </Box>
                  </Grid>
                ) : (
                  sharedDocs.map((doc) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 3,
                          transition: 'transform 0.2s, border-color 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: 'rgba(168, 85, 247, 0.4)',
                            background: 'rgba(30, 41, 59, 0.6)',
                          },
                        }}
                      >
                        <CardContent
                          sx={{ flexGrow: 1, cursor: 'pointer', p: 3 }}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <DocIcon sx={{ color: '#a855f7' }} />
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#ffffff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {doc.title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#94a3b8',
                              mb: 2,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              minHeight: '3.6em',
                            }}
                            dangerouslySetInnerHTML={{
                              __html: doc.content
                                ? doc.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...'
                                : 'No content...',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Updated: {formatDate(doc.updatedAt)}
                          </Typography>
                        </CardContent>
                        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                        <CardActions sx={{ justifyContent: 'space-between', px: 3, py: 1.5 }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                            Shared by: <span style={{ color: '#c084fc' }}>{doc.owner.username}</span>
                          </Typography>
                          <Box
                            sx={{
                              bgcolor: 'rgba(168, 85, 247, 0.1)',
                              color: '#c084fc',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                            }}
                          >
                            Shared
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            )}
          </Box>
        )}
      </Container>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Rename Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{
              mt: 1,
              width: 300,
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputBase-input': { color: '#ffffff' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                '&:hover fieldset': { borderColor: '#818cf8' },
                '&.Mui-focused fieldset': { borderColor: '#c084fc' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRenameDialogOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleRenameSubmit}
            variant="contained"
            disabled={actionLoading}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              textTransform: 'none',
              fontWeight: 'bold',
              borderRadius: 2,
              px: 3,
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
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

export default Dashboard;
