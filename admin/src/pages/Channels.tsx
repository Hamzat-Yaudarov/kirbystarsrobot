import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import { Add, Edit, Delete, ToggleOn, ToggleOff } from '@mui/icons-material'
import { channelsApi } from '../services/api'

interface Channel {
  id: string
  название: string
  chatId: string
  ссылка?: string
  активен: boolean
}

const Channels: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [formData, setFormData] = useState({
    название: '',
    chatId: '',
    ссылка: '',
  })

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const response = await channelsApi.getChannels()
      setChannels(response.data)
    } catch (error) {
      setError('Ошибка загрузки каналов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingChannel(null)
    setFormData({ название: '', chatId: '', ссылка: '' })
    setDialogOpen(true)
  }

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel)
    setFormData({
      название: channel.название,
      chatId: channel.chatId,
      ссылка: channel.ссылка || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        название: formData.название,
        chatId: formData.chatId,
        ссылка: formData.ссылка || null,
      }

      if (editingChannel) {
        await channelsApi.updateChannel(editingChannel.id, data)
      } else {
        await channelsApi.createChannel(data)
      }

      setDialogOpen(false)
      loadChannels()
    } catch (error) {
      console.error('Ошибка сохранения канала:', error)
    }
  }

  const handleDelete = async (channel: Channel) => {
    if (window.confirm(`Удалить канал "${channel.название}"?`)) {
      try {
        await channelsApi.deleteChannel(channel.id)
        loadChannels()
      } catch (error) {
        console.error('Ошибка удаления канала:', error)
      }
    }
  }

  const handleToggle = async (channel: Channel) => {
    try {
      await channelsApi.toggleChannel(channel.id)
      loadChannels()
    } catch (error) {
      console.error('Ошибка изменения статуса канала:', error)
    }
  }

  const columns: GridColDef[] = [
    { field: 'название', headerName: 'Название', width: 200 },
    {
      field: 'chatId',
      headerName: 'Chat ID',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'ссылка',
      headerName: 'Ссылка',
      width: 250,
      renderCell: (params) => params.value ? (
        <a href={params.value} target="_blank" rel="noopener noreferrer">
          {params.value}
        </a>
      ) : '—',
    },
    {
      field: 'активен',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Активен' : 'Неактивен'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Действия',
      width: 200,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Редактировать"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          icon={params.row.активен ? <ToggleOff /> : <ToggleOn />}
          label={params.row.активен ? 'Деактивировать' : 'Активировать'}
          onClick={() => handleToggle(params.row)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Удалить"
          onClick={() => handleDelete(params.row)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">📺 Обязательные каналы</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Добавить канал
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        Пользователи должны быть подписаны на эти каналы для использования бота
      </Alert>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={channels}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingChannel ? 'Редактировать канал' : 'Добавить канал'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название канала"
              value={formData.название}
              onChange={(e) => setFormData({ ...formData, название: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Chat ID"
              value={formData.chatId}
              onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Например: @channel или -1001234567890"
            />
            <TextField
              fullWidth
              label="Ссылка (необязательно)"
              value={formData.ссылка}
              onChange={(e) => setFormData({ ...formData, ссылка: e.target.value })}
              helperText="Ссылка для подписки, если канал закрытый"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.название || !formData.chatId}
          >
            {editingChannel ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Channels
