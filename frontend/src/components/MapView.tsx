import { Component, type ReactNode } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';

export interface MapPoint { id: string; lat: number; lng: number; label: string; sub?: string; kind: 'request' | 'hospital' | 'bank' | 'me' }
const COLORS: Record<MapPoint['kind'], string> = { request: '#E63950', hospital: '#4F7CFF', bank: '#22A06B', me: '#17191D' };

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 13); return; }
    map.fitBounds(points.map((p) => [p.lat, p.lng] as [number, number]), { padding: [30, 30], maxZoom: 14 });
  }, [points, map]);
  return null;
}

/** Leaflet + OpenStreetMap. If the map cannot render, `fallback` (the same info as a list) is shown instead. */
export function MapView({ points, fallback, height = 320 }: { points: MapPoint[]; fallback: ReactNode; height?: number }) {
  if (points.length === 0) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback}>
      <Box sx={{ height, borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', '& .leaflet-container': { height: '100%', width: '100%' } }}>
        <MapContainer center={[points[0].lat, points[0].lng]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Fit points={points} />
          {points.map((p) => (
            <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={p.kind === 'me' ? 8 : 10} pathOptions={{ color: '#fff', weight: 2, fillColor: COLORS[p.kind], fillOpacity: 0.95 }}>
              <Tooltip direction="top"><Typography variant="caption" fontWeight={700}>{p.label}</Typography>{p.sub && <Typography variant="caption" display="block">{p.sub}</Typography>}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </Box>
    </Boundary>
  );
}
