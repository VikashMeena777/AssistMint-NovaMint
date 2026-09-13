import { buildAppointmentFlow } from "../src/lib/flows/definitions";
const flowJson = buildAppointmentFlow([
  { id: "s1", name: "Consultation", price: 49900 },
  { id: "s2", name: "Follow-up", price: 29900 },
]) as any;
console.log("routing_model:", JSON.stringify(flowJson.routing_model));
flowJson.screens.forEach((s: any, i: number) => {
  console.log(`\n=== screen ${i}: ${s.id} ===`);
  s.layout.children.forEach((c: any, j: number) => {
    console.log(`  [${j}] type=${c.type}${c.component_type ? " (component_type=" + c.component_type + ")" : ""} text=${(c.text || "").slice(0, 40)}`);
  });
});
