import { Designation } from './employee.model';
import { ApiResponse } from './api-response.model';

export interface SidebarNode {
  nodeId: string;
  name: string;
  path: string;
  icon?: string;
  allowedDesignations: Designation[];
}

export type MyNodesResponse = ApiResponse<{
  totalNodes: number;
  nodes: SidebarNode[];
}>;
