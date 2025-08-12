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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Add,
  Edit,
  Delete,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material'
import { tasksApi } from '../services/api'

interface Task {
  id: string
  название: string
  описание: string
  награда: number
  тип: string
  ссылка: string
  chatId?: string
  порядок: number
  активно: boolean
  выполнено: number
  датаСоздания: string
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    название: '',
    описание: '',
    награда: '',
    тип: 'channel',
    ссылка: '',
    chatId: '',
    порядок: '',
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await tasksApi.getTasks()
      setTasks(response.data)
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error)
      setError('Ошибка загрузки заданий')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTask(null)
    setFormData({
      название: '',
      описание: '',
      награда: '',
      тип: 'channel',
      ссылка: '',
      chatId: '',
      порядок: '0',
    })
    setDialogOpen(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      название: task.название,
      описание: task.описание,
      награда: task.награда.toString(),
      тип: task.ти��,
      ссылка: task.ссылка,
      chatId: task.chatId || '',
      порядок: task.порядок.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        название: formData.название,
        описание: formData.описание,
        награда: parseFloat(formData.награда),
        тип: formData.тип,
        ссылка: formData.ссылка,
        chatId: formData.chatId || null,
        порядок: parseInt(formData.порядок) || 0,
      }

      if (editingTask) {
        await tasksApi.updateTask(editingTask.id, data)
      } else {
        await tasksApi.createTask(data)
      }

      setDialogOpen(false)
      loadTasks()
    } catch (error) {
      console.error('Ошибка сохранения задания:', error)
    }
  }

  const handleDelete = async (task: Task) => {
    if (window.confirm(`Удалить задание "${task.название}"?`)) {
      try {
        await tasksApi.deleteTask(task.id)
        loadTasks()
      } catch (error) {
        console.error('Ошибка удаления задания:', error)
      }
    }
  }

  const handleToggle = async (task: Task) => {
    try {
      await tasksApi.toggleTask(task.id)
      loadTasks()
    } catch (error) {
      console.error('Ошибка изменения статуса задания:', error)
    }
  }

  const getTaskTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      channel: 'Канал',
      chat: 'Чат',
      bot: 'Бот',
    }
    return types[type] || type
  }

  const columns: GridColDef[] = [
    {
      field: 'название',
      headerName: 'Название',
      width: 200,
    },
    {
      field: 'описание',
      headerName: 'Описание',
      width: 250,
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
      field: 'тип',
      headerName: 'Тип',
      width: 100,
      renderCell: (params) => (
        <Chip label={getTaskTypeLabel(params.value)} size="small" />
      ),
    },
    {
      field: 'награда',
      headerName: 'Награда ⭐',
      width: 120,
      type: 'number',
    },
    {
      field: 'выполнено',
      headerName: 'Выполнено',
      width: 100,
      type: 'number',
    },
    {
      field: 'порядок',
      headerName: 'Порядок',
      width: 100,
      type: 'number',
    },
    {
      field: 'активно',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Активно' : 'Неактивно'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'датаСоздания',
      headerName: 'Создано',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('ru-RU'),
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
          icon={params.row.активно ? <ToggleOff /> : <ToggleOn />}
          label={params.row.активно ? 'Деактивировать' : 'Активировать'}
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
        <Typography variant="h4">
          📋 Управление заданиями
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
        >
          Создать задание
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={tasks}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? 'Редактировать задание' : 'Создать задание'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название задания"
              value={formData.название}
              onChange={(e) => setFormData({ ...formData, название: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Описание"
              multiline
              rows={3}
              value={formData.описание}
              onChange={(e) => setFormData({ ...formData, описание: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Награда (звёзды)"
              type="number"
              value={formData.награда}
              onChange={(e) => setFormData({ ...formData, награда: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Тип задания</InputLabel>
              <Select
                value={formData.тип}
                label="Тип задания"
                onChange={(e) => setFormData({ ...formData, тип: e.target.value })}
              >
                <MenuItem value="channel">Канал</MenuItem>
                <MenuItem value="chat">Чат</MenuItem>
                <MenuItem value="bot">Бот</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Ссылка"
              value={formData.ссылка}
              onChange={(e) => setFormData({ ...formData, ссылка: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Ссылка на канал/чат/бота"
            />
            <TextField
              fullWidth
              label="Chat ID (для проверки)"
              value={formData.chatId}
              onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Для автоматической проверки подписки (например: @channel или -1001234567890)"
            />
            <TextField
              fullWidth
              label="Порядок отображения"
              type="number"
              value={formData.порядок}
              onChange={(e) => setFormData({ ...formData, порядок: e.target.value })}
              helperText="Чем меньше число, тем раньше показывается задание"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.название || !formData.описание || !formData.награда || !formData.ссылка}
          >
            {editingTask ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Tasks
