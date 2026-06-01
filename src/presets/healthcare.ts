import type { DomainPreset } from "./registry.js";

export const healthcarePreset: DomainPreset = {
  name: "healthcare",
  description: "Healthcare appointment platform — patients, doctors, appointments, prescriptions",
  plugins: ["jwt"],
  resources: [
    {
      name: "Patient",
      fields: ["name:string", "email:string", "phone:string", "dateOfBirth:date", "address:string"],
    },
    {
      name: "Doctor",
      fields: ["name:string", "email:string", "specialty:string", "phone:string", "bio:string"],
    },
    {
      name: "Appointment",
      fields: ["date:datetime", "status:string", "notes:string"],
      relations: ["patient:Patient", "doctor:Doctor"],
    },
    {
      name: "Prescription",
      fields: ["medication:string", "dosage:string", "instructions:string", "issuedDate:date"],
      relations: ["patient:Patient", "doctor:Doctor"],
    },
    {
      name: "MedicalRecord",
      fields: ["diagnosis:string", "treatment:string", "notes:string", "recordDate:date"],
      relations: ["patient:Patient", "doctor:Doctor"],
    },
  ],
};
