import { Designation } from './employee.model';
export interface SidebarNode {
  nodeId: string;
  name: string;
  path: string;
  icon?: string;
  allowedDesignations: Designation[];
}

export interface MyNodesResponse {
  totalNodes: number;
  nodes: SidebarNode[];
}
