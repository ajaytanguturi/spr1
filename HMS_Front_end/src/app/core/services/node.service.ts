import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MyNodesResponse, SidebarNode } from '../models/node.model';

@Injectable({
  providedIn: 'root',
})
export class NodeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/nodes`;

  private cachedNodes: SidebarNode[] | null = null;

  getMyNodes(): Observable<MyNodesResponse> {
    return this.http.get<MyNodesResponse>(`${this.apiUrl}/my-nodes`);
  }

  loadMyNodes(): Observable<SidebarNode[]> {
    if (this.cachedNodes) {
      return of(this.cachedNodes);
    }
    return this.getMyNodes().pipe(
      map((res) => res.data?.nodes ?? []),
      tap((nodes) => (this.cachedNodes = nodes)),
    );
  }
  clearCache(): void {
    this.cachedNodes = null;
  }
}
