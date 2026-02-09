import { currentUser } from "@clerk/nextjs";
import { prisma } from "../../lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
    const user = await currentUser();

    if (!user) return <div>Vous devez être connecté.</div>;

    const dbUser = await prisma.user.upsert({
        where: { clerkId: user.id },
        update: {},
        create: {
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        },
    });

    const lists = await prisma.list.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        include: { items: true},
    });

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <header className="max-w-5xl mx-auto flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        Bonjour, {dbUser.name} !
                    </h1>
                    <p className="text-slate-500">Gérez vos envies et vos cadeaux.>Gérez vous envies et vos cadeaux.</p>
                </div>
            </header>
            <main className="mb-8">
                <div>
                    <Link 
                        href="/lists/new"
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                    >
                        Créer une liste
                    </Link>
                </div>
                {lists.lenght === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <p className="text-xl text-slate-400 font-medium">Vous n'avez pas encore de liste.</p>
                        <p className="text-slate-400">Commencez par en créer une pour Noël ou votre Anniversaire !</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lists.map((list) => (
                            <Link key={list.id} href={`/lists/${list.id}`} className="group">
                                <div className="gb-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                                {list.category || "Général"}
                                            </span>
                                            {list.isPrivate && <span>lock</span>}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                            {list.title}
                                        </h3>
                                        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between text-sm text-slate-400">
                                            <span>{list.items.length} cadeaux</span>
                                            <span>Créée le {new Date(list.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )

}