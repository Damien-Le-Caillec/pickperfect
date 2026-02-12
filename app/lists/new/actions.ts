"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createList(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("eventDate") as string;
  const isPrivate = formData.get("isPrivate") === "on";

  let eventDate = null;
  if (dateStr && dateStr.trim() !== "") {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      eventDate = parsedDate;
    }
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) return;

  await prisma.list.create({
    data: {
      title,
      description,
      category,
      eventDate,
      isPrivate,
      userId: user.id,
    },
  });

  redirect("/home");
}