
import { Marker } from './MarkerDetectionService';

export class CanvasRenderer {
  /**
   * Draw video frame to canvas
   */
  drawVideoFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number): void {
    ctx.drawImage(video, 0, 0, width, height);
  }

  /**
   * Draw marker corners
   */
  drawMarkerCorners(ctx: CanvasRenderingContext2D, markers: Marker[]): void {
    ctx.lineWidth = 3;
    
    for (let i = 0; i < markers.length; ++i) {
      const corners = markers[i].corners;
      
      // Draw outline
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      for (let j = 0; j < corners.length; ++j) {
        const corner = corners[j];
        ctx.moveTo(corner.x, corner.y);
        const nextCorner = corners[(j + 1) % corners.length];
        ctx.lineTo(nextCorner.x, nextCorner.y);
      }
      ctx.stroke();
      ctx.closePath();
      
      // Draw first corner as special point
      ctx.strokeStyle = 'green';
      ctx.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
    }
  }

  /**
   * Draw marker IDs
   */
  drawMarkerIds(ctx: CanvasRenderingContext2D, markers: Marker[]): void {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < markers.length; ++i) {
      const corners = markers[i].corners;
      let x = Infinity;
      let y = Infinity;
      
      // Find top-left point for text
      for (let j = 0; j < corners.length; ++j) {
        const corner = corners[j];
        x = Math.min(x, corner.x);
        y = Math.min(y, corner.y);
      }
      
      ctx.strokeText(markers[i].id.toString(), x, y);
    }
  }
}
