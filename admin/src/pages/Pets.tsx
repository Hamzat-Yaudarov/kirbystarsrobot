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
import { Add, Edit, Delete, ToggleOn, ToggleOff } from '@mui/icons-material'
import { petsApi } from '../services/api'

interface Pet {
  id: string
  название: string
  описание: string
  цена: number
  типБуста: string
  значениеБуста: number
  картинка?: string
  активен: boolean
  владельцев: number
  датаСоздания: string
}

const Pets: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [formData, setFormData] = useState({
    название: '',
    описание: '',
    цена: '',
    типБуста: 'click',
    значениеБуста: '',
    картинка: '',
  })

  const boostTypes = {
    click: 'Увеличение дохода от кликов',
    referral1: 'Увеличение дохода от рефералов 1 уровня',
    referral2: 'Увеличение дохода от рефералов 2 уровня',
    task: 'Увеличение дохода от заданий',
  }

  useEffect(() => {
    loadPets()
  }, [])

  const loadPets = async () => {
    try {
      setLoading(true)
      const response = await petsApi.getPets()
      setPets(response.data)
    } catch (error) {
      setError('Ошибка загрузки питомцев')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPet(null)
    setFormData({
      название: '',
      описание: '',
      цена: '',
      типБуста: 'click',
      значениеБуста: '',
      картинка: '',
    })
    setDialogOpen(true)
  }

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet)
    setFormData({
      название: pet.название,
      описание: pet.описание,
      цена: pet.цена.toString(),
      типБуста: pet.типБуста,
      значениеБуста: pet.значениеБуста.toString(),
      картинка: pet.картинка || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        название: formData.название,
        описание: formData.описание,
        цена: parseFloat(formData.цена),
        типБуста: formData.типБуста,
        значениеБуста: parseFloat(formData.значениеБуста),
        картинка: formData.картинка || null,
      }

      if (editingPet) {
        await petsApi.updatePet(editingPet.id, data)
      } else {
        await petsApi.createPet(data)
      }

      setDialogOpen(false)
      loadPets()
    } catch (error) {
      console.error('Ошибка сохранения питомца:', error)
    }
  }

  const handleDelete = async (pet: Pet) => {
    if (window.confirm(`Удалить питомца "${pet.название}"?`)) {
      try {
        await petsApi.deletePet(pet.id)
        loadPets()
      } catch (error) {
        console.error('Ошибка удаления питомца:', error)
      }
    }
  }

  const handleToggle = async (pet: Pet) => {
    try {
      await petsApi.togglePet(pet.id)
      loadPets()
    } catch (error) {
      console.error('Ошибка изменения статуса питомца:', error)
    }
  }

  const columns: GridColDef[] = [
    { field: 'название', headerName: 'Название', width: 150 },
    { field: 'описание', headerName: 'Описание', width: 250 },
    { field: 'цена', headerName: 'Цена ⭐', width: 100, type: 'number' },
    {
      field: 'типБуста',
      headerName: 'Тип буста',
      width: 150,
      renderCell: (params) => (
        <Chip label={boostTypes[params.value as keyof typeof boostTypes]} size="small" />
      ),
    },
    { field: 'значениеБуста', headerName: 'Буст', width: 100, type: 'number' },
    { field: 'владельцев', headerName: 'Владельцев', width: 100, type: 'number' },
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
        <Typography variant="h4">🐾 Управление питомцами</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Создать питомца
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={pets}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPet ? 'Редактировать питомца' : 'Создать питомца'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название"
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
              label="Цена (звёзды)"
              type="number"
              value={formData.цена}
              onChange={(e) => setFormData({ ...formData, цена: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Тип буста</InputLabel>
              <Select
                value={formData.типБуста}
                label="Тип буста"
                onChange={(e) => setFormData({ ...formData, типБуста: e.target.value })}
              >
                {Object.entries(boostTypes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Значение буста"
              type="number"
              step="0.01"
              value={formData.значениеБуста}
              onChange={(e) => setFormData({ ...formData, значениеБуста: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="URL картинки (необязательно)"
              value={formData.картинка}
              onChange={(e) => setFormData({ ...formData, картинка: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.название || !formData.описание || !formData.цена || !formData.значениеБуста}
          >
            {editingPet ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Pets
