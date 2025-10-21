import React, { useState } from 'react';
import { Zap, Plus, Play, Save, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  label: string;
  config: Record<string, any>;
}

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);

  const nodeTypes = [
    { type: 'trigger', label: 'File Upload', icon: Zap, color: 'blue' },
    { type: 'action', label: 'AI Analysis', icon: Settings, color: 'purple' },
    { type: 'action', label: 'Send Notification', icon: Zap, color: 'green' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Builder</h2>
          <p className="text-sm text-gray-500 mt-1">Automate your file management tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Test Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {nodeTypes.map((node, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <node.icon className={`w-8 h-8 mx-auto mb-3 text-${node.color}-500`} />
                <h3 className="font-medium text-gray-900">{node.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{node.type}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <Zap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Drag and drop workflow nodes here to build your automation</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowBuilder;
