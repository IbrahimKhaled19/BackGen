import type { DomainPreset } from "./registry.js";

export const lmsPreset: DomainPreset = {
  name: "lms",
  description: "Learning Management System — courses, lessons, enrollments, progress, certificates",
  plugins: ["jwt"],
  resources: [
    {
      name: "Course",
      fields: ["title:string", "slug:string", "description:string", "price:number", "imageUrl:string"],
    },
    {
      name: "Lesson",
      fields: ["title:string", "content:string", "videoUrl:string", "order:number", "duration:number"],
      relations: ["course:Course"],
    },
    {
      name: "Enrollment",
      fields: ["status:string", "enrolledAt:datetime"],
      relations: ["course:Course"],
    },
    {
      name: "Progress",
      fields: ["completed:boolean", "completedAt:datetime"],
      relations: ["lesson:Lesson", "enrollment:Enrollment"],
    },
    {
      name: "Certificate",
      fields: ["certificateNumber:string", "issuedAt:datetime", "pdfUrl:string"],
      relations: ["enrollment:Enrollment"],
    },
  ],
};
