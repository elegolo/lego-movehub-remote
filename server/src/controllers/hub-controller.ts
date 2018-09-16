import MovehubAsync = require('movehub-async');
import { BehaviorSubject, from, fromEvent, Observable, of, ReplaySubject, Subject, timer } from 'rxjs';
import { combineLatest, map, pairwise, take, takeUntil } from 'rxjs/operators';

import { IControlState } from '../interfaces/IControlState';
import { IDeviceInfo } from '../interfaces/IDeviceInfo';

export class HubController {
    public deviceInfo: BehaviorSubject<IDeviceInfo>;

    private hub: MovehubAsync.Hub;
    private device: IDeviceInfo;
    private timer: Observable<number>;
    private _control: BehaviorSubject<IControlState>;
    private _led: ReplaySubject<MovehubAsync.LedColor>;
    private externalMotorAngle: BehaviorSubject<number>;
    private unsubscribe: Subject<boolean>;

    constructor(deviceInfo: IDeviceInfo, controlState: IControlState) {
        this.hub = null;
        this.unsubscribe = new Subject<boolean>();
        this.deviceInfo = new BehaviorSubject<IDeviceInfo>(deviceInfo);
        this._led = new ReplaySubject<MovehubAsync.LedColor>(1);
        this.device = deviceInfo;
        this._control = new BehaviorSubject<IControlState>(controlState);
        this.externalMotorAngle = new BehaviorSubject<number>(0);
    }

    public start(): Observable<void> {
        return from(MovehubAsync.getHubAsync()).pipe(
            take(1),
            map(hub => {
                this.device.connected = true;
                this.deviceInfo.next(this.device);
                this.hub = hub;

                fromEvent(this.hub, 'error').subscribe((err: string) => {
                    this.device.error = err;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'disconnect').subscribe(() => {
                    this.device.connected = false;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'distance').subscribe((distance: number) => {
                    this.device.distance = distance;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'rssi').subscribe((rssi: number) => {
                    this.device.rssi = rssi;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'port').subscribe((action: MovehubAsync.IPortAction) => {
                    this.device.ports[action.port].action = action.action;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'color').subscribe((color: string) => {
                    this.device.color = color;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'tilt').subscribe((tilt: MovehubAsync.ITilt) => {
                    this.device.tilt.roll = tilt.roll;
                    this.device.tilt.pitch = tilt.pitch;
                    this.deviceInfo.next(this.device);
                });

                fromEvent(this.hub, 'rotation').subscribe((rotation: MovehubAsync.IPortRotation) => {
                    this.device.ports[rotation.port].angle = rotation.angle;
                    this.deviceInfo.next(this.device);
                });

                this.subscribeLed();
                this.subscribeControl();
                this.subscribeExternalMotorAngle();

                return;
            })
        );
    }

    public disconnect(): Observable<void> {
        if (this.device.connected && this.hub) {
            return from(this.hub.disconnectAsync()).pipe(
                map(() => {
                    this.unsubscribe.next(true);
                    this.unsubscribe.complete();
                    this.device.connected = false;
                    this.deviceInfo.next(this.device);
                    this.deviceInfo.complete();
                    this._control.complete();
                })
            );
        } else {
            this.unsubscribe.next(true);
            this.unsubscribe.complete();
            this.deviceInfo.complete();
            this._control.complete();
            return of();
        }
    }

    public set control(controlState: IControlState) {
        this._control.next(controlState);
    }

    public set led(color: MovehubAsync.LedColor) {
        this._led.next(color);
    }

    private subscribeControl() {
        this.timer = timer(0, 29500);
        this._control
            .pipe(
                combineLatest(this.timer),
                takeUntil(this.unsubscribe)
            )
            .subscribe(params => {
                this.externalMotorAngle.next(params[0].externalMotor);
                let motorA = params[0].motorA > 100 ? 100 : params[0].motorA;
                motorA = motorA < -100 ? -100 : motorA;
                let motorB = params[0].motorB > 100 ? 100 : params[0].motorB;
                motorB = motorB < -100 ? -100 : motorB;

                this.hub.motorTimeMulti(30, motorA, motorB);
            });
    }

    private subscribeLed() {
        this._led.pipe(takeUntil(this.unsubscribe)).subscribe(color => {
            this.hub.led(color);
        });
    }

    private subscribeExternalMotorAngle() {
        this.externalMotorAngle
            .pipe(
                pairwise(),
                takeUntil(this.unsubscribe)
            )
            .subscribe(values => {
                if (values[0] !== values[1]) {
                    if (values[0] === 359 && values[1] === 0) {
                        this.hub.motorAngle('D', 1, 100);
                    } else if (values[0] === 0 && values[1] === 359) {
                        this.hub.motorAngle('D', 1, -100);
                    } else if (values[0] > values[1]) {
                        this.hub.motorAngle('D', values[0] - values[1], -100);
                    } else {
                        this.hub.motorAngle('D', values[1] - values[0], 100);
                    }
                }
            });
    }
}
