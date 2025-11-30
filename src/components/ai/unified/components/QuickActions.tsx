import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { quickActions } from '../constants/quick-actions';
import { QuickAction } from '../types/assistant';

interface QuickActionsProps {
  showQuickActions: boolean;
  onToggleQuickActions: () => void;
  onQuickAction: (action: QuickAction) => void;
}

export const QuickActions = ({
  showQuickActions,
  onToggleQuickActions,
  onQuickAction
}: QuickActionsProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-blue-400 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
            onClick={onToggleQuickActions}
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    onClick={() => onQuickAction(action)}
                    className={`justify-start h-auto p-2 bg-gradient-to-r ${action.color} hover:opacity-90 text-white`}
                  >
                    <div className="flex items-center">
                      {action.icon}
                      <div className="ml-2 text-left">
                        <div className="text-xs font-medium">{action.name}</div>
                        <div className="text-xs opacity-80">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
