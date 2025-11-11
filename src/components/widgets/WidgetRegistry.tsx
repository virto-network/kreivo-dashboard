import React from 'react';
import { Command } from '@/data/commands.en';

export interface WidgetProps {
  command: Command;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export interface WidgetConfig {
  id: string;
  component: React.ComponentType<WidgetProps>;
  fields: string[];
}

import { CreateCommunityWidget } from './CreateCommunityWidget';
import { SendTransactionWidget } from './SendTransactionWidget';
import { ViewAccountWidget } from './ViewAccountWidget';
import { BlockExplorerWidget } from './BlockExplorerWidget';
import { AddMemberWidget } from './AddMemberWidget';

export const widgetRegistry: Record<string, React.ComponentType<WidgetProps>> = {
  'create-community': CreateCommunityWidget,
  'send-transaction': SendTransactionWidget,
  'view-account': ViewAccountWidget,
  'block-explorer': BlockExplorerWidget,
  'add-member-community': AddMemberWidget,
};

export const getWidget = (commandId: string): React.ComponentType<WidgetProps> | null => {
  return widgetRegistry[commandId] || null;
};

