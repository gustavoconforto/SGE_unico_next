import { describe, expect, it } from "vitest";
import { parseCmc7 } from "./cmc7";

// Samples from the cmc7-validador npm package's tests
describe("parseCmc7", () => {
  it("splits a valid line into banco, agência, número and conta", () => {
    expect(parseCmc7("<56738425< 8540653355> 047966833262:")).toEqual({
      bank: "567",
      branch: "3842",
      number: "065335",
      account: "4796683326",
    });
    expect(parseCmc7("450445043466147665081657326823")).toMatchObject({ bank: "450", branch: "4450" });
    expect(parseCmc7("021672635408779395013196461480")).not.toBeNull();
    expect(parseCmc7("536363941121372575520227637152")).not.toBeNull();
  });

  it("rejects a wrong check digit or length", () => {
    expect(parseCmc7("18776221 6209755155 974742302660")).toBeNull();
    expect(parseCmc7("94823691 2824042655 734892470802")).toBeNull();
    expect(parseCmc7("94823691 282404365 734892470802")).toBeNull();
    expect(parseCmc7("000123")).toBeNull();
  });
});
