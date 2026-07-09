export const defaultSchema = {
  fields: [
    {
      name: "full_name",
      label: "Full name",
      type: "text",
      required: true,
      placeholder: "Jane Doe",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      placeholder: "jane@example.com",
    },
    {
      name: "interest",
      label: "What are you interested in?",
      type: "select",
      required: true,
      options: ["Product demo", "Support", "Partnership"],
    },
    {
      name: "message",
      label: "Message",
      type: "textarea",
      required: false,
      placeholder: "Share a few details",
    },
  ],
};

export const fieldTypes = ["text", "textarea", "email", "number", "select", "checkbox", "date"];

