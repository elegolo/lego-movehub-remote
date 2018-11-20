import { Consts, Hub } from 'node-poweredup';
import { BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { IAttachEvent } from '../interfaces/events/IAttachEvent';
import { IButtonEvent } from '../interfaces/events/IButtonEvent';
import { IColorEvent } from '../interfaces/events/IColorEvent';
import { IDetachEvent } from '../interfaces/events/IDetachEvent';
import { IDistanceEvent } from '../interfaces/events/IDistanceEvent';
import { IRotationEvent } from '../interfaces/events/IRotationEvent';
import { ITiltEvent } from '../interfaces/events/ITiltEvent';
import { AttachEvent } from '../model/events/AttachEvent';
import { ButtonEvent } from '../model/events/ButtonEvent';
import { ColorEvent } from '../model/events/ColorEvent';
import { DetatchEvent } from '../model/events/DetachEvent';
import { DistanceEvent } from '../model/events/DistanceEvent';
import { RotationEvent } from '../model/events/RotationEvent';
import { TiltEvent } from '../model/events/TiltEvent';
import { HubState } from '../model/hubState';
import { MotorPortState } from '../model/motorPortState';

export class HubController {
    public hubState: BehaviorSubject<HubState>;
    private disconnectNotifier: Subject<any> = new Subject<any>();
    private _hubState: HubState;

    constructor(private hub: Hub) {
        this._hubState = new HubState(hub.name);
        this.hubState = new BehaviorSubject(this._hubState);
    }

    public init() {
        fromEvent<IButtonEvent>(this.hub, 'button', (...args: any[]) => new ButtonEvent(args))
            .pipe(takeUntil(this.disconnectNotifier))
            .subscribe(eventData => {
                console.log(
                    `${this.hub.name} button ${eventData.button} state ${Consts.ButtonStates[eventData.state]}`
                );
                this.updateHubState();
            });

        fromEvent<IDistanceEvent>(this.hub, 'distance', (...args: any[]) => new DistanceEvent(args))
            .pipe(
                debounceTime(250),
                takeUntil(this.disconnectNotifier)
            )
            .subscribe(eventData => {
                console.log(`${this.hub.name} detected distance of ${eventData.distance}mm on port ${eventData.port}`);
                this.updateHubState();
            });

        fromEvent<IColorEvent>(this.hub, 'color', (...args: any[]) => new ColorEvent(args))
            .pipe(debounceTime(250))
            .subscribe(eventData => {
                console.log(
                    `${this.hub.name} detected color of ${Consts.Colors[eventData.detectedColor]}mm on port ${
                        eventData.port
                    }`
                );
                this.updateHubState();
            });

        fromEvent<ITiltEvent>(this.hub, 'tilt', (...args: any[]) => new TiltEvent(args))
            .pipe(debounceTime(1000))
            .subscribe(eventData => {
                console.log(
                    `${this.hub.name} detected tilt of (${eventData.x},${eventData.y}) on port ${eventData.port}`
                );
                this.updateHubState();
            });

        fromEvent<IRotationEvent>(this.hub, 'rotate', (...args: any[]) => new RotationEvent(args))
            .pipe(
                debounceTime(250),
                takeUntil(this.disconnectNotifier)
            )
            .subscribe(eventData => {
                console.log(`${this.hub.name} detected rotation of ${eventData.rotation} on port ${eventData.port}`);
                this.updateHubState();
            });

        fromEvent<IAttachEvent>(this.hub, 'attach', (...args: any[]) => new AttachEvent(args))
            .pipe(takeUntil(this.disconnectNotifier))
            .subscribe(eventData => {
                console.log(`${this.hub.name} connected ${Consts.Devices[eventData.type]} on port ${eventData.port}`);
                switch (eventData.type) {
                    case Consts.Devices.BASIC_MOTOR:
                    case Consts.Devices.BOOST_MOVE_HUB_MOTOR:
                    case Consts.Devices.BOOST_TACHO_MOTOR:
                    case Consts.Devices.DUPLO_TRAIN_BASE_MOTOR:
                    case Consts.Devices.TRAIN_MOTOR:
                        this._hubState.motorPorts.push(new MotorPortState(eventData.port, eventData.type));
                }
                this.updateHubState();
            });

        fromEvent<IDetachEvent>(this.hub, 'detach', (...args: any[]) => new DetatchEvent(args))
            .pipe(takeUntil(this.disconnectNotifier))
            .subscribe(eventData => {
                console.log(`${this.hub.name} disconnected device on port ${eventData.port}`);
                this.updateHubState();
            });

        this.hub.on('disconnect', () => {
            console.log(`this.hub ${this.hub.name} disconnected`);
            this.updateHubState(false);
            this.disconnectNotifier.next(false);
        });

        this.updateHubState(true);
    }

    private updateHubState(connected: boolean = true) {
        this._hubState.connected = connected;
        this._hubState.batteryLevel = this.hub.batteryLevel;
        this.hubState.next(this._hubState);
    }
}
