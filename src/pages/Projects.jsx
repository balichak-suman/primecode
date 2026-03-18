import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { API_URL } from '../config/api';

const SortableTask = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    marginBottom: '1rem',
    cursor: 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>{task.title}</h4>
      <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{task.description}</p>
    </div>
  );
};

const KanbanColumn = ({ status, tasks, title }) => {
  return (
    <div className="kanban-column" style={{ flex: 1, minWidth: '300px' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {title} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>({tasks.length})</span>
      </h3>
      <div className="column-content" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', minHeight: '400px' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
      if (res.data.length > 0) setCurrentProject(res.data[0]);
    } catch (err) {
      console.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = currentProject.tasks.findIndex(t => t.id === active.id);
    const newIndex = currentProject.tasks.findIndex(t => t.id === over.id);

    const newTasks = arrayMove(currentProject.tasks, oldIndex, newIndex);
    
    // Update local state immediately
    setCurrentProject({ ...currentProject, tasks: newTasks });

    // Sync with backend (simple implementation for now)
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/projects/tasks/${active.id}`, 
        { position: newIndex }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to sync position');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="projects-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h2 className="gradient-text">Project Ecosystem</h2>
        <select 
          className="form-input" 
          style={{ width: 'auto' }}
          value={currentProject?.id}
          onChange={(e) => setCurrentProject(projects.find(p => p.id === parseInt(e.target.value)))}
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!currentProject ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p>No active projects found. Contact HR to be assigned to a project.</p>
        </div>
      ) : (
        <div className="kanban-board" style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '2rem' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <KanbanColumn 
              title="To Do" 
              status="pending" 
              tasks={currentProject.tasks.filter(t => t.status === 'pending')} 
            />
            <KanbanColumn 
              title="In Progress" 
              status="in_progress" 
              tasks={currentProject.tasks.filter(t => t.status === 'in_progress')} 
            />
            <KanbanColumn 
              title="Completed" 
              status="completed" 
              tasks={currentProject.tasks.filter(t => t.status === 'completed')} 
            />
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default Projects;
