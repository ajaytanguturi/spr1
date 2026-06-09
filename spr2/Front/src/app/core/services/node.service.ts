import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MyNodesResponse } from '../models/node.model';

@Injectable({
  providedIn: 'root',
})
export class NodeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/nodes`;

  getMyNodes(): Observable<MyNodesResponse> {
    return this.http.get<MyNodesResponse>(`${this.apiUrl}/my-nodes`);
  }
}
