import { describe, expect, it } from "bun:test";
import {
  checkModelFile,
  checkPanorama,
  isEquirectangular,
  matchLedMaterials,
  sceneHasMedia,
  ledFrame,
  isTaggedLed,
  sanitizeLedPreset,
} from "./immersive";

describe("immersive rules", () => {
  it("accepts only 2:1 spherical panoramas", () => {
    expect(isEquirectangular(8192, 4096)).toBe(true);
    expect(isEquirectangular(12000, 3000)).toBe(false); // phone horizontal pano
  });
  it("rejects a horizontal iPhone panorama", () => {
    const r = checkPanorama({ type: "image/jpeg", size: 1e6 }, 16000, 3500);
    expect(r.ok).toBe(false);
  });
  it("rejects panoramas over 50MB and non jpeg/webp", () => {
    expect(checkPanorama({ type: "image/jpeg", size: 51 * 1024 * 1024 }, 8192, 4096).ok).toBe(false);
    expect(checkPanorama({ type: "image/png", size: 1e6 }, 8192, 4096).ok).toBe(false);
  });
  it("warns but accepts small 2:1 panoramas from 2048px", () => {
    expect(checkPanorama({ type: "image/webp", size: 1e6 }, 2048, 1024).warning).toBeTruthy();
    expect(checkPanorama({ type: "image/webp", size: 1e6 }, 2000, 1000).ok).toBe(false);
  });
  it("requires .glb models", () => {
    expect(checkModelFile({ name: "car.gltf", size: 10 }).ok).toBe(false);
    expect(checkModelFile({ name: "car.glb", size: 10 }).ok).toBe(true);
  });
  it("hides scenes without media", () => {
    expect(sceneHasMedia("panorama", {}, null)).toBe(false);
    expect(sceneHasMedia("compare", { display: "a" }, null)).toBe(false);
    expect(sceneHasMedia("video", {}, "https://youtu.be/x")).toBe(true);
  });
  it("offers LED colours only for materials present in the model", () => {
    expect(matchLedMaterials(["LED_Strip"], ["Seat", "Dash"])).toEqual([]);
    expect(matchLedMaterials(["LED_Strip"], ["LED_Strip", "Dash"])).toEqual(["LED_Strip"]);
  });
  it("chase lights the head zone brightest and dims others", () => {
    expect(ledFrame("chase", 0, 0, 4).level).toBe(1);
    expect(ledFrame("chase", 0, 2, 4).level).toBeLessThan(0.5);
  });
  it("detects LED tags from glTF extras or LED_ names only", () => {
    expect(isTaggedLed("Seat", { sklightLed: true })).toBe(true);
    expect(isTaggedLed("LED_Door", undefined)).toBe(true);
    expect(isTaggedLed("Sled", undefined)).toBe(false);
  });
  it("drops preset zone colours for unconfigured materials", () => {
    const p = sanitizeLedPreset({ materials: ["LED_A"], presets: [{ name: "Tím", effect: "chase", color: "#bf5af2", zoneColors: { LED_A: "#ffffff", Seat: "#000000" } }] });
    expect(p.presets[0].zoneColors).toEqual({ LED_A: "#ffffff" });
    expect(p.presets[0].effect).toBe("chase");
  });
});

import { sceneActions, pickSceneForTag, mapSceneForNavigation } from "./immersive";

describe("admin scene actions", () => {
  it("published + changed → hide and republish", () => {
    expect(sceneActions("published", true)).toEqual({ unpublish: true, publish: false, republish: true });
  });
  it("published unchanged → hide only", () => {
    expect(sceneActions("published", false)).toEqual({ unpublish: true, publish: false, republish: false });
  });
  it("draft → publish only", () => {
    expect(sceneActions("draft", false)).toEqual({ unpublish: false, publish: true, republish: false });
  });
});

const S = [
  { id: "dash", title: "Taplo", tag: "" },
  { id: "dashP", title: "Taplo", tag: "purple" },
  { id: "door", title: "Cửa", tag: "" },
  { id: "doorP", title: "Cửa", tag: "purple" },
  { id: "roofR", title: "Trần", tag: "red" },
  { id: "x", title: "", tag: "" },
];

describe("LED colour scene picking", () => {
  it("picks same viewpoint with the colour", () => {
    expect(pickSceneForTag(S, S[0], "purple")).toBe("dashP");
  });
  it("never jumps to another viewpoint", () => {
    expect(pickSceneForTag(S, S[0], "red")).toBe(null);
  });
  it("untitled current scene keeps old fallback", () => {
    expect(pickSceneForTag(S, S[5], "red")).toBe("roofR");
  });
  it("hotspot keeps colour when target viewpoint has it", () => {
    expect(mapSceneForNavigation(S, "dashP", "door")).toBe("doorP");
  });
  it("hotspot falls back to target when colour missing", () => {
    expect(mapSceneForNavigation(S, "dashP", "roofR")).toBe("roofR");
    expect(mapSceneForNavigation(S, "dash", "doorP")).toBe("doorP");
  });
});

import { planSceneRetention } from "./immersive";
describe("planSceneRetention", () => {
  it("keeps current + previous only", () => {
    expect(planSceneRetention(["b", "a"], "c")).toEqual({ keep: ["c", "b"], drop: ["a"] });
  });
  it("returning to previous scene keeps both, drops nothing", () => {
    expect(planSceneRetention(["c", "b"], "b")).toEqual({ keep: ["b", "c"], drop: [] });
  });
  it("first scene keeps itself", () => {
    expect(planSceneRetention([], "a")).toEqual({ keep: ["a"], drop: [] });
  });
  it("long navigation never keeps more than 2", () => {
    let recent = [];
    for (const id of ["a", "b", "c", "d", "e"]) recent = planSceneRetention(recent, id).keep;
    expect(recent).toEqual(["e", "d"]);
  });
});
