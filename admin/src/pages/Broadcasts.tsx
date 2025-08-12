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
import { Add, Edit, Delete, Send } from '@mui/icons-material'
import { broadcastsApi } from '../services/api'

interface Broadcast {
  id: string
  заголовок: string
  содержание: string
  кнопки?: any
  отправлена: boolean
  количествоОтправлений: number
  датаСоздания: string
  датаОтправки?: string
}

const Broadcasts: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
  const [formData, setFormData] = useState({
    заголовок: '',
    содержание: '',
    кнопки: '',
  })

  useEffect(() => {
    loadBroadcasts()
  }, [])

  const loadBroadcasts = async () => {
    try {
      setLoading(true)
      const response = await broadcastsApi.getBroadcasts()
      setBroadcasts(response.data)
    } catch (error) {
      setError('Ошибка загрузки рассылок')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingBroadcast(null)
    setFormData({
      заголовок: '',
      содержание: '',
      кнопки: '',
    })
    setDialogOpen(true)
  }

  const handleEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast)
    setFormData({
      заголовок: broadcast.заголовок,
      содержание: broadcast.содержание,
      кнопки: broadcast.кнопки ? JSON.stringify(broadcast.кнопки, null, 2) : '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        заголовок: formData.заголовок,
        содержание: formData.содержание,
        кнопки: formData.кнопки || null,
      }

      if (editingBroadcast) {
        await broadcastsApi.updateBroadcast(editingBroadcast.id, data)
      } else {
        await broadcastsApi.createBroadcast(data)
      }

      setDialogOpen(false)
      loadBroadcasts()
    } catch (error) {
      console.error('Ошибка сохранения рассылки:', error)
    }
  }

  const handleSend = async (broadcast: Broadcast) => {
    if (window.confirm(`Отправить рассылку "${broadcast.заголовок}" всем пользователям?`)) {
      try {
        await broadcastsApi.sendBroadcast(broadcast.id)
        loadBroadcasts()
      } catch (error) {
        console.error('Ошибка отправки рассылки:', error)
      }
    }
  }

  const handleDelete = async (broadcast: Broadcast) => {
    if (window.confirm(`Удалить рассылку "${broadcast.заголовок}"?`)) {
      try {
        await broadcastsApi.deleteBroadcast(broadcast.id)
        loadBroadcasts()
      } catch (error) {
        console.error('Ошибка удаления рассылки:', error)
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'заголовок', headerName: 'Заголовок', width: 200 },
    {
      field: 'содержание',
      headerName: 'Содержание',
      width: 300,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'отправлена',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Отправлена' : 'Черновик'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'количествоОтправлений',
      headerName: 'Отправлено',
      width: 120,
      type: 'number',
    },
    {
      field: 'датаСоздания',
      headerName: 'Создана',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('ru-RU'),
    },
    {
      field: 'датаОтправки',
      headerName: 'Отправлена',
      width: 120,
      renderCell: (params) => params.value 
        ? new Date(params.value).toLocaleDateString('ru-RU')
        : '—',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Действия',
      width: 200,
      getActions: (params: GridRowParams) => [
        ...(!params.row.отправлена ? [
          <GridActionsCellItem
            icon={<Edit />}
            label="Редактировать"
            onClick={() => handleEdit(params.row)}
          />,
          <GridActionsCellItem
            icon={<Send />}
            label="Отправить"
            onClick={() => handleSend(params.row)}
          />,
        ] : []),
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
        <Typography variant="h4">📢 Управление рассылками</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Создать рассылку
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={broadcasts}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBroadcast ? 'Редактировать рассылку' : 'Создать рассылку'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Заголовок"
              value={formData.заголовок}
              onChange={(e) => setFormData({ ...formData, заголовок: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Содержание сообщения"
              multiline
              rows={6}
              value={formData.содержание}
              onChange={(e) => setFormData({ ...formData, содержание: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Кнопки (JSON, необязательно)"
              multiline
              rows={4}
              value={formData.кнопки}
              onChange={(e) => setFormData({ ...formData, кнопки: e.target.value })}
              helperText='Пример: [[ {"text": "Кнопка", "callback_data": "action"} ]]'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.заголовок || !formData.содержание}
          >
            {editingBroadcast ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Broadcasts
