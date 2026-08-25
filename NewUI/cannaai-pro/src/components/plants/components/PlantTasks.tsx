import React, { useState } from 'react';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import icons
import { CheckSquare } from 'lucide-react';

const PlantTasks: React.FC = () => {
  const [taskName, setTaskName] = useState('');
  const [tasks, setTasks] = useState<Array<{ id: number; name: string; done: boolean }>>([]);

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    const name = taskName.trim();
    if (!name) return;
    setTasks((current) => [...current, { id: Date.now(), name, done: false }]);
    setTaskName('');
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
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Add Task</button>
          </form>
          {tasks.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No tasks yet. Add watering, inspection, or harvest actions above.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-[#0f1419] p-3">
                  <button type="button" aria-label={`${task.done ? 'Reopen' : 'Complete'} task ${task.name}`} onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} className={`h-5 w-5 rounded border ${task.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'}`}>
                    {task.done ? '✓' : ''}
                  </button>
                  <span className={`flex-1 text-sm ${task.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.name}</span>
                  <button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))} className="text-xs text-red-400 hover:text-red-300">Remove</button>
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
