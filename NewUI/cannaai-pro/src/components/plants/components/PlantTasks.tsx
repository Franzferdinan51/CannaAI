import React, { useEffect, useState } from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import icons
import { CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import plantsAPI from '../api-client';
import { PlantTask } from '../types';

const PlantTasks: React.FC = () => {
  const [taskName, setTaskName] = useState('');
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void plantsAPI.getPlantTasks().then((loadedTasks) => {
      if (!cancelled) setTasks(loadedTasks);
    }).catch((error) => {
      if (!cancelled) toast.error(error instanceof Error ? error.message : 'Failed to load tasks');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = taskName.trim();
    if (!name || isSaving) return;
    setIsSaving(true);
    try {
      const task = await plantsAPI.createPlantTask({
        title: name,
        description: '',
        type: 'monitoring',
        priority: 'medium',
        plantIds: [],
        schedule: { type: 'once', isActive: false },
        status: 'pending',
      });
      setTasks((current) => [task, ...current]);
      setTaskName('');
      toast.success('Task added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add task');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTask = async (task: PlantTask) => {
    try {
      const updated = task.status === 'completed'
        ? await plantsAPI.updatePlantTask(task.id, { status: 'pending', completedAt: undefined })
        : await plantsAPI.completePlantTask(task.id);
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const removeTask = async (task: PlantTask) => {
    try {
      await plantsAPI.deletePlantTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.success('Task removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove task');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-emerald-400" />
            Plant Tasks & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTask} className="flex flex-col gap-2 sm:flex-row">
            <input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Add a cultivation task" className="flex-1 rounded-lg border border-gray-700 bg-[#0f1419] px-3 py-2 text-sm text-white" />
            <button type="submit" disabled={isSaving || !taskName.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Adding…' : 'Add Task'}</button>
          </form>
          {isLoading ? (
            <p className="mt-4 text-sm text-gray-400">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No tasks yet. Add watering, inspection, or harvest actions above.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0f1419] p-3">
                  <button type="button" aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} task ${task.title}`} onClick={() => void toggleTask(task)} className={`h-5 w-5 rounded border ${task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'}`}>
                    {task.status === 'completed' ? '✓' : ''}
                  </button>
                  <span className={`flex-1 text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.title}</span>
                  <button type="button" onClick={() => void removeTask(task)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlantTasks;
