import type { Vehicle, RoadSegment, TrafficLight } from '../types';
import { TRAFFIC_LIGHT_CYCLE } from '../core/constants';
import type { RoadGenerator } from './RoadGenerator';

let nextVehicleId = 0;

const VEHICLE_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#FDD835', '#FFFFFF'];

export class TrafficEngine {
  private vehicles: Vehicle[] = [];
  private trafficLights: TrafficLight[] = [];
  private roadGenerator: RoadGenerator;

  constructor(roadGenerator: RoadGenerator) {
    this.roadGenerator = roadGenerator;
  }

  generate(roads: RoadSegment[]): { vehicles: Vehicle[]; trafficLights: TrafficLight[] } {
    nextVehicleId = 0;
    this.vehicles = [];
    this.trafficLights = [];

    const primaryRoads = roads.filter(
      (r) => r.type === 'primary' || r.type === 'secondary'
    );

    for (const road of primaryRoads) {
      const vehicleCount = road.type === 'primary' ? 1 + Math.floor(Math.random() * 2) : 1;
      for (let i = 0; i < vehicleCount; i++) {
        const path = this.roadGenerator.getRoadWorldPath(road);
        if (path.length < 2) continue;

        this.vehicles.push({
          id: nextVehicleId++,
          roadId: road.id,
          position: [...path[0]],
          rotation: 0,
          speed: 0.02 + Math.random() * 0.04,
          progress: Math.random(),
          color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
        });
      }

      if (road.hasTrafficLight) {
        const roadPath = this.roadGenerator.getRoadWorldPath(road);
        if (roadPath.length < 2) continue;
        const midIdx = Math.floor(roadPath.length / 2);
        this.trafficLights.push({
          id: this.trafficLights.length,
          position: roadPath[midIdx],
          roadId: road.id,
          state: Math.random() > 0.5 ? 'green' : 'red',
          timer: Math.random() * TRAFFIC_LIGHT_CYCLE,
        });
      }
    }

    return { vehicles: this.vehicles, trafficLights: this.trafficLights };
  }

  update(roads: RoadSegment[], deltaTime: number): void {
    for (const light of this.trafficLights) {
      light.timer += deltaTime * 0.001;
      if (light.timer >= TRAFFIC_LIGHT_CYCLE) {
        light.timer = 0;
        light.state = light.state === 'red' ? 'green' : 'red';
      }
    }

    for (const vehicle of this.vehicles) {
      const road = roads.find((r) => r.id === vehicle.roadId);
      if (!road) continue;

      const light = this.trafficLights.find((l) => l.roadId === road.id);
      if (light && light.state === 'red' && vehicle.progress > 0.4 && vehicle.progress < 0.6) {
        continue;
      }

      vehicle.progress += vehicle.speed;
      if (vehicle.progress >= 1) vehicle.progress = 0;

      const path = this.roadGenerator.getRoadWorldPath(road);
      if (path.length < 2) continue;

      const totalSegments = path.length - 1;
      const scaledProgress = vehicle.progress * totalSegments;
      const segIdx = Math.min(Math.floor(scaledProgress), totalSegments - 1);
      const segT = scaledProgress - segIdx;

      const from = path[segIdx];
      const to = path[segIdx + 1];

      vehicle.position[0] = from[0] + (to[0] - from[0]) * segT;
      vehicle.position[1] = from[1] + (to[1] - from[1]) * segT + 0.05;
      vehicle.position[2] = from[2] + (to[2] - from[2]) * segT;

      vehicle.rotation = Math.atan2(to[0] - from[0], to[2] - from[2]);
    }
  }

  getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  getTrafficLights(): TrafficLight[] {
    return this.trafficLights;
  }
}
