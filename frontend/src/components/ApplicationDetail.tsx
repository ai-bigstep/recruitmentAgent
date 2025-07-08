import * as React from 'react';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
  Button,
  Paper,
  Typography,
  Link,
  Rating,
  Box,
  TextField,
  Select,
  MenuItem,
  IconButton,
  InputLabel,
  FormControl,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';

const baseURL = import.meta.env.VITE_API_BASE_URL;

interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  ats_score: number;
  resume_url: string;
  rating?: number;
  call_status?: string;
  call_analysis?: string;
  is_accepted?: boolean;
  status?: string;
}

const ApplicationDetail: React.FC = () => {
  const [rows, setRows] = React.useState<Candidate[]>([]);
  const [ratedCandidates, setRatedCandidates] = React.useState<Set<string>>(new Set());
  const [shortlistDisabled, setShortlistDisabled] = React.useState<Set<string>>(new Set());
  const [disabledCalls, setDisabledCalls] = React.useState<Set<string>>(new Set());
  const [atsFilter, setAtsFilter] = React.useState<number | null>(null);
  const [ratingFilter, setRatingFilter] = React.useState<number | null>(null);
  const [rowSelectionModel, setRowSelectionModel] =
  React.useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  const { jobId } = useParams();
  const job_id = jobId;

  React.useEffect(() => {
    if (!jobId) return;
    fetch(`${baseURL}/api/applicant/job/${job_id}`)
      .then(res => res.json())
      .then(data => setRows(data))
      .catch(err => {
        console.error('Failed to fetch applicants:', err);
        setRows([]);
      });
      
  }, [jobId]);

  const handleCallClick = async (id: string) => {
    setDisabledCalls((prev) => new Set(prev).add(id));
    console.log(`Calling candidate ID ${id}...`);
    if (!jobId) return;
    try {
      const res = await fetch(`${baseURL}/api/applicant/call/${jobId}/${id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to enqueue call request');
      // Optionally show a success message or update UI
      console.log('Call request enqueued successfully');
    } catch (err) {
      alert('Failed to enqueue call request.');
      console.error(err);
    }
  };

  

  const handleRatingChange = async (id: string, newRating: number | null) => {
    if (newRating !== null) {
      try {
        const res = await fetch(`${baseURL}/api/applicant/update/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: newRating }),
        });
        if (!res.ok) throw new Error('Failed to update applicant');
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, rating: newRating } : row
          )
        );
        setRatedCandidates((prev) => new Set(prev).add(id));
      } catch (err) {
        alert('Failed to update applicant.');
        console.error(err);
      }
    }
  };

  // Helper to get selected IDs as array
  const selectedIdArray = Array.from(
    rowSelectionModel && 'ids' in rowSelectionModel ? rowSelectionModel.ids : []
  );

  const handleDeleteSelected = async () => {
    // Soft delete each selected applicant via backend
    try {
      await Promise.all(selectedIdArray.map(async (id) => {
        const res = await fetch(`${baseURL}/api/applicant/delete/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error(`Failed to delete applicant with id ${id}`);
        }
        if (res.ok) {
          console.log(`Applicant with id ${id} deleted successfully`);
        }
      }));
      setRows((prev) => prev.filter((row) => !selectedIdArray.includes(row.id)));
      setRowSelectionModel({ type: 'include', ids: new Set() });
    } catch (err) {
      alert('Failed to delete one or more applicants.');
      console.error(err);
    }
  };

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      const passAts = atsFilter !== null ? row.ats_score >= atsFilter : true;
      const passRating = ratingFilter !== null ? (row.rating ?? 0) >= ratingFilter : true;
      return passAts && passRating;
    });
  }, [rows, atsFilter, ratingFilter]);

  const columns: GridColDef[] = [
    // { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 130 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'email', headerName: 'Email', width: 230 },
    {
      field: 'resume_url',
      headerName: 'Resume',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Link href={params.row.resume_url} target="_blank" rel="noopener" underline="hover">
          View Resume
        </Link>
      ),
    },
    { field: 'ats_score', headerName: 'ATS Score', width: 100 },
    {
      field: 'status',
      headerName: 'AI Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.row.status}
        </Typography>
      ),
    },
    {
      field: 'rating',
      headerName: 'HR Rating',
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const candidateId = params.row.id;
        const currentRating = params.row.rating ?? 0;
        const isRated = ratedCandidates.has(candidateId);

        return (
          <Box>
            <Rating
              name={`rating-${candidateId}`}
              value={currentRating}
              disabled={isRated}
              onChange={(_, newValue) => handleRatingChange(candidateId, newValue)}
              size="small"
              sx={{
                opacity: 1,
                color: '#ffb400',
                '& .MuiRating-iconEmpty': {
                  color: '#d3d3d3',
                },
                '&.Mui-disabled': {
                  opacity: 1,
                  color: '#ffb400',
                  '& .MuiRating-iconEmpty': {
                    color: '#d3d3d3',
                  },
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'call',
      headerName: 'Call',
      width: 130,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          variant="contained"
          size="small"
          disabled={disabledCalls.has(params.row.id)}
          onClick={() => handleCallClick(params.row.id)}
        >
          {disabledCalls.has(params.row.id) ? 'Called' : 'Call'}
        </Button>
      ),
    },
    {
      field: 'call_status',
      headerName: 'Call Status',
      width: 130,
    },
    {
      field: 'call_analysis',
      headerName: 'Call Analysis',
      width: 200,
    },
    {
      field: 'is_accepted',
      headerName: 'Result',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const { is_accepted } = params.row;
        if (is_accepted === true) {
          return (
            <Typography
              variant="body2"
              color="green"
              sx={{ fontWeight: 600, mt: 2 }}
            >
              Shortlisted
            </Typography>
          );
        } else if (is_accepted === false) {
          return (
            <Typography
              variant="body2"
              color="red"
              sx={{ fontWeight: 600, mt: 2 }}
            >
              Rejected
            </Typography>
          );
        } else {
          return null;
        }
      },
    },
  ];

  return (
    <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Applications for Job ID: {jobId}
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Min ATS Score"
          type="number"
          size="small"
          value={atsFilter ?? ''}
          onChange={(e) => setAtsFilter(e.target.value ? parseInt(e.target.value) : null)}
        />
        <TextField
          label="Min HR Rating"
          type="number"
          size="small"
          inputProps={{ min: 0, max: 5, step: 0.5 }}
          value={ratingFilter ?? ''}
          onChange={(e) => setRatingFilter(e.target.value ? parseFloat(e.target.value) : null)}
        />
        <Button variant="outlined" onClick={() => {
          setAtsFilter(null);
          setRatingFilter(null);
        }}>
          Clear Filters
        </Button>
        {selectedIdArray.length > 0 && (
          <>
            <IconButton aria-label="delete" color="error" onClick={handleDeleteSelected}>
              <DeleteIcon />
            </IconButton>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={async () => {
                // Bulk shortlist
                try {
                  await Promise.all(selectedIdArray.map(async (id) => {
                    const res = await fetch(`${baseURL}/api/applicant/update/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_accepted: true }),
                    });
                    if (!res.ok) throw new Error(`Failed to shortlist applicant with id ${id}`);
                  }));
                  setRows((prev) => prev.map((row) =>
                    selectedIdArray.includes(row.id) ? { ...row, is_accepted: true } : row
                  ));
                } catch (err) {
                  alert('Failed to shortlist one or more applicants.');
                  console.error(err);
                }
              }}
              sx={{ ml: 1 }}
            >
              Shortlist
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={async () => {
                // Bulk reject
                try {
                  await Promise.all(selectedIdArray.map(async (id) => {
                    const res = await fetch(`${baseURL}/api/applicant/update/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_accepted: false }),
                    });
                    if (!res.ok) throw new Error(`Failed to reject applicant with id ${id}`);
                  }));
                  setRows((prev) => prev.map((row) =>
                    selectedIdArray.includes(row.id) ? { ...row, is_accepted: false } : row
                  ));
                } catch (err) {
                  alert('Failed to reject one or more applicants.');
                  console.error(err);
                }
              }}
              sx={{ ml: 1 }}
            >
              Reject
            </Button>
          </>
        )}
      </Box>

      <DataGrid
        rows={filteredRows}
        columns={columns}
        pageSizeOptions={[5, 10]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        checkboxSelection
        disableRowSelectionOnClick
       
        // onRowSelectionModelChange={(ids) => setSelectedIds(ids as unknown as string[])}

        onRowSelectionModelChange={(newRowSelectionModel) => {
          console.log(newRowSelectionModel);
          setRowSelectionModel(newRowSelectionModel);
        }}
        rowSelectionModel={rowSelectionModel}
        sx={{ border: 0, height: 500 }}
      />
    </Paper>
  );
};

export default ApplicationDetail;
