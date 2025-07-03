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
}

const initialRows: Candidate[] = [
  {
    id: '1',
    name: 'Jon Snow',
    phone: '1234567890',
    email: 'jon.snow@example.com',
    ats_score: 85,
    resume_url: 'https://example.com/resumes/jon.pdf',
    call_status: 'Scheduled',
    call_analysis: 'Good communication skills',
  },
  {
    id: '2',
    name: 'Cersei Lannister',
    phone: '9876543210',
    email: 'cersei.lannister@example.com',
    ats_score: 78,
    resume_url: 'https://example.com/resumes/cersei.pdf',
    call_status: 'Completed',
    call_analysis: 'Very confident',
  },
  {
    id: '3',
    name: 'Jaime Lannister',
    phone: '9998887777',
    email: 'jaime.lannister@example.com',
    ats_score: 82,
    resume_url: 'https://example.com/resumes/jaime.pdf',
    call_status: 'Pending',
    call_analysis: '',
  },
  {
    id: '4',
    name: 'Arya Stark',
    phone: '1112223333',
    email: 'arya.stark@example.com',
    ats_score: 92,
    resume_url: 'https://example.com/resumes/arya.pdf',
    call_status: 'Scheduled',
    call_analysis: 'Highly skilled',
  },
];

const ApplicationDetail: React.FC = () => {
  const [rows, setRows] = React.useState<Candidate[]>(initialRows);
  const [ratedCandidates, setRatedCandidates] = React.useState<Set<string>>(new Set());
  const [shortlistDisabled, setShortlistDisabled] = React.useState<Set<string>>(new Set());
  const [disabledCalls, setDisabledCalls] = React.useState<Set<string>>(new Set());
  const [atsFilter, setAtsFilter] = React.useState<number | null>(null);
  const [ratingFilter, setRatingFilter] = React.useState<number | null>(null);
  const [rowSelectionModel, setRowSelectionModel] =
  React.useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  const { jobId } = useParams();
  console.log(`Job ID: ${jobId}`);

  const handleCallClick = (id: string) => {
    setDisabledCalls((prev) => new Set(prev).add(id));
    console.log(`Calling candidate ID ${id}...`);
  };

  const handleShortlistToggle = (id: string, isAccepted: boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, is_accepted: isAccepted } : row
      )
    );
    setShortlistDisabled((prev) => new Set(prev).add(id));
  };

  const handleRatingChange = (id: string, newRating: number | null) => {
    if (newRating !== null) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, rating: newRating } : row
        )
      );
      setRatedCandidates((prev) => new Set(prev).add(id));
    }
  };

  // Helper to get selected IDs as array
  const selectedIdArray = Array.from(
    rowSelectionModel && 'ids' in rowSelectionModel ? rowSelectionModel.ids : []
  );

  const handleDeleteSelected = () => {
    setRows((prev) => prev.filter((row) => !selectedIdArray.includes(row.id)));
    setRowSelectionModel({ type: 'include', ids: new Set() });
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
        const { id, is_accepted } = params.row;
        const isDisabled = shortlistDisabled.has(id);

        if (isDisabled) {
          return (
            <Typography
              variant="body2"
              color={is_accepted ? 'green' : 'red'}
              sx={{ fontWeight: 600, mt: 2 }}
            >
              {is_accepted ? 'Shortlisted' : 'Rejected'}
            </Typography>
          );
        }

        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleShortlistToggle(id, true)}
              size="small"
              sx={{ height: '30px', fontSize: '0.75rem', minWidth: 0, mt: 1 }}
            >
              Shortlist
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleShortlistToggle(id, false)}
              size="small"
              sx={{ height: '30px', fontSize: '0.75rem', minWidth: 0, mt: 1 }}
            >
              Reject
            </Button>
          </div>
        );
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
