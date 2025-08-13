import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent, Chip, Avatar, Badge,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  CircularProgress, List, ListItem, ListItemText, ListItemAvatar, Divider,
  Tooltip, Stack, Paper, LinearProgress, FormControlLabel, Switch
} from '@mui/material';
import {
  Send, Edit, Delete, Reply, Flag, FlagOutlined, Star, StarBorder,
  Notifications, NotificationsOff, Business, Person, Assignment, Phone,
  Build, Inventory, CheckCircle, Warning, Error, Info, ExpandMore, ExpandLess,
  Comment, Visibility, VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import useApi from '../hooks/useApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

function TicketComments({ ticketId, onCommentUpdate }) {
  const { user } = useAuth();
  const api = useApi();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    comment: '',
    is_internal: false
  });

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${ticketId}/comments`);
      setComments(response || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [api, ticketId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      const commentData = {
        ticket_id: ticketId,
        comment: newComment.trim(),
        is_internal: isInternal
      };

      await api.post(`/tickets/${ticketId}/comments/`, commentData);
      
      setNewComment('');
      setIsInternal(false);
      fetchComments();
      
      if (onCommentUpdate) onCommentUpdate();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  const handleEditComment = async () => {
    if (!editFormData.comment.trim()) return;

    try {
      await api.put(`/tickets/${ticketId}/comments/${editingComment.comment_id}`, {
        comment: editFormData.comment.trim(),
        is_internal: editFormData.is_internal
      });

      setEditDialogOpen(false);
      setEditingComment(null);
      setEditFormData({ comment: '', is_internal: false });
      fetchComments();
      
      if (onCommentUpdate) onCommentUpdate();
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/tickets/${ticketId}/comments/${commentId}`);
      fetchComments();
      
      if (onCommentUpdate) onCommentUpdate();
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

  const openEditDialog = (comment) => {
    setEditingComment(comment);
    setEditFormData({
      comment: comment.comment,
      is_internal: comment.is_internal
    });
    setEditDialogOpen(true);
  };

  const canEditComment = (comment) => {
    return user?.user_id === comment.user_id || user?.role === 'admin' || user?.role === 'dispatcher';
  };

  const canDeleteComment = (comment) => {
    return user?.user_id === comment.user_id || user?.role === 'admin';
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Comment color="primary" />
            Comments ({comments.length})
          </Typography>

          {/* Add New Comment */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Add a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment here..."
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isInternal ? <VisibilityOff /> : <Visibility />}
                    {isInternal ? 'Internal Note' : 'Customer Visible'}
                  </Box>
                }
              />
              
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                Add Comment
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Comments List */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : comments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              No comments yet
            </Typography>
          ) : (
            <List>
              {comments.map((comment, index) => (
                <React.Fragment key={comment.comment_id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {comment.user?.name || 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(comment.created_at).fromNow()}
                          </Typography>
                          {comment.is_internal && (
                            <Chip
                              icon={<VisibilityOff />}
                              label="Internal"
                              size="small"
                              color="warning"
                            />
                          )}
                          {comment.updated_at && comment.updated_at !== comment.created_at && (
                            <Chip
                              label="Edited"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {comment.comment}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canEditComment(comment) && (
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(comment)}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {canDeleteComment(comment) && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteComment(comment.comment_id)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                  {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Edit Comment Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment"
            value={editFormData.comment}
            onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
            sx={{ mt: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editFormData.is_internal}
                onChange={(e) => setEditFormData({ ...editFormData, is_internal: e.target.checked })}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {editFormData.is_internal ? <VisibilityOff /> : <Visibility />}
                {editFormData.is_internal ? 'Internal Note' : 'Customer Visible'}
              </Box>
            }
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditComment} variant="contained">
            Update Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TicketComments; 