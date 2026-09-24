import type {
  PipecatClientOptions,
  RTVIEventCallbacks,
  RTVIMessage,
  Tracks,
  TransportConnectionParams,
  TransportState,
} from "@pipecat-ai/client-js";
import { Transport } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";
import { WebSocketTransport } from "@pipecat-ai/websocket-transport";

export type TransportType =
  | "daily"
  | "smallwebrtc"
  | "small-webrtc"
  | "websocket"
  | "moq"
  | "livekit"
  | "mock";

/** Constructor options passed through to whichever transport is created. */
export type TransportOptions = Record<string, unknown>;

export type TransportFactory = (
  options?: TransportOptions,
) => Transport | Promise<Transport>;

/**
 * Transport used by the "Pipeline Simulator" option. It never opens a real
 * connection — it walks through the same state machine a real transport
 * would, so UI that reacts to transport state (connect buttons, status
 * indicators) works without a live bot behind it.
 */
class MockTransport extends Transport {
  private _micEnabled = true;
  private _camEnabled = false;
  private _screenShareEnabled = false;

  initialize(
    options: PipecatClientOptions,
    messageHandler: (ev: RTVIMessage) => void,
  ): void {
    this._options = options;
    this._onMessage = messageHandler;
    this._callbacks = options.callbacks ?? ({} as RTVIEventCallbacks);
    this.state = "initialized";
  }

  async initDevices(): Promise<void> {
    this.state = "initializing";
    this.state = "initialized";
  }

  _validateConnectionParams(connectParams?: unknown): unknown {
    return connectParams;
  }

  async _connect(_connectParams?: TransportConnectionParams): Promise<void> {
    this.state = "connecting";
    this.state = "connected";
    this.sendReadyMessage();
  }

  async _disconnect(): Promise<void> {
    this.state = "disconnected";
  }

  sendReadyMessage(): void {
    this.state = "ready";
  }

  get state(): TransportState {
    return this._state;
  }

  set state(state: TransportState) {
    this._state = state;
    this._callbacks?.onTransportStateChanged?.(state);
  }

  async getAllMics(): Promise<MediaDeviceInfo[]> {
    return [];
  }

  async getAllCams(): Promise<MediaDeviceInfo[]> {
    return [];
  }

  async getAllSpeakers(): Promise<MediaDeviceInfo[]> {
    return [];
  }

  updateMic(_micId: string): void {}
  updateCam(_camId: string): void {}
  updateSpeaker(_speakerId: string): void {}

  get selectedMic(): MediaDeviceInfo | Record<string, never> {
    return {};
  }

  get selectedCam(): MediaDeviceInfo | Record<string, never> {
    return {};
  }

  get selectedSpeaker(): MediaDeviceInfo | Record<string, never> {
    return {};
  }

  enableMic(enable: boolean): void {
    this._micEnabled = enable;
  }

  enableCam(enable: boolean): void {
    this._camEnabled = enable;
  }

  enableScreenShare(enable: boolean): void {
    this._screenShareEnabled = enable;
  }

  get isCamEnabled(): boolean {
    return this._camEnabled;
  }

  get isMicEnabled(): boolean {
    return this._micEnabled;
  }

  get isSharingScreen(): boolean {
    return this._screenShareEnabled;
  }

  sendMessage(_message: RTVIMessage): void {}

  tracks(): Tracks {
    return { local: {} };
  }
}

/** Builds the transport for a given type. Unsupported types throw a clear error rather than silently falling back. */
export async function createTransport(
  type: TransportType,
  options?: TransportOptions,
): Promise<Transport> {
  switch (type) {
    case "smallwebrtc":
    case "small-webrtc":
      return new SmallWebRTCTransport(options);
    case "websocket":
      return new WebSocketTransport(options);
    case "mock":
      return new MockTransport();
    case "daily":
    case "livekit":
    case "moq":
      throw new Error(
        `Transport "${type}" is not installed in this app. Add its @pipecat-ai package and extend createTransport() in src/lib/transports.ts.`,
      );
    default:
      throw new Error(`Unknown transport type: ${type}`);
  }
}
