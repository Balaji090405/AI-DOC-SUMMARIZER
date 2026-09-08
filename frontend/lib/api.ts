export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://ai-doc-summarizer-qpp0.onrender.com").replace(/\/$/, "");

export function getFileDirectUrl(id: string, token: string): string {
  return `${API_URL}/projects/${id}/file?token=${encodeURIComponent(token)}`;
}

export async function getFileBlobUrl(id: string, token: string): Promise<string> {
  const url = getFileDirectUrl(id, token);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load document preview: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function signup(email: string, password: string, name?: string) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Signup failed");
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
  return res.json();
}

export async function getMe(token: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function uploadFile(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/projects/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
  return res.json();
}

export async function listProjects(token: string) {
  const res = await fetch(`${API_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function deleteProject(id: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

export async function getProject(id: string, token: string) {
  const projects = await listProjects(token);
  const project = projects.find((p: any) => p.id === id);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function summarizeProject(id: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${id}/summarize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Summarize failed");
  return res.json();
}

export async function sendChatMessage(id: string, question: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${id}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Chat failed");
  return res.json();
}

export async function getChatHistory(id: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${id}/chat/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load chat history");
  return res.json();
}

export async function clearChatHistory(id: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${id}/chat/history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to clear chat history");
  return res.json();
}

export async function streamChat(
  id: string,
  question: string,
  token: string,
  onToken: (token: string) => void,
  onSources: (sources: any[]) => void,
  onDone: () => void
) {
  const res = await fetch(`${API_URL}/projects/${id}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });

  if (!res.ok || !res.body) throw new Error("Chat stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = JSON.parse(line.slice(6));
      if (json.type === "sources") onSources(json.sources);
      else if (json.type === "token") onToken(json.content);
      else if (json.type === "done") onDone();
    }
  }
}