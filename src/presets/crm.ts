import type { DomainPreset } from "./registry.js";

export const crmPreset: DomainPreset = {
  name: "crm",
  description: "CRM system — contacts, companies, deals, activities, pipeline",
  plugins: ["jwt"],
  resources: [
    {
      name: "Contact",
      fields: ["firstName:string", "lastName:string", "email:string", "phone:string", "jobTitle:string"],
    },
    {
      name: "Company",
      fields: ["name:string", "industry:string", "website:string", "phone:string"],
    },
    {
      name: "Deal",
      fields: ["title:string", "value:number", "stage:string", "closeDate:date"],
      relations: ["contact:Contact", "company:Company"],
    },
    {
      name: "Activity",
      fields: ["type:string", "subject:string", "notes:string", "dueDate:datetime"],
      relations: ["contact:Contact", "deal:Deal"],
    },
  ],
};
