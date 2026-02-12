"use client";

import { createList } from "./actions";
import Link from "next/link";
import { useState} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";


export default function NewListPage() {
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const weekDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

    const getDaysInMonts = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayInMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        setSelectedDate(newDate);
        setShowCalendar(false);
    }

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate.setMonth(viewDate.getMonth() + offset));
        setViewDate(new Date(newDate));
    }

    const formatteDisplayDate = selectedDate ? `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : '';
    const formattedInputDate = selectedDate ? selectedDate.toISOString().split('T')[0] : '';

    return (
        <div>
            <div>
                <div>
                    <h1>Nouvelle Liste</h1>
                    <p>Créez un espace pour vos envies.</p>
                </div>

                <form action={createList}>
                    <div>
                        <label>Titre de la liste</label>
                        <input 
                            name="title" 
                            type="text" 
                            placeholder="Ex: Noël 2026..."
                            required
                        />
                    </div>
                    <div>
                        <label>Petite description (Optionnel)</label>
                        <textarea
                            name="desciption"
                            placeholder="Ex: Quelques idées..."
                            rows={3}
                        />
                    </div>
                    <div>
                        <div>
                            <label>Occasion</label>
                            <div>
                                <select name="category">
                                    <option value="Noël">Noël</option>
                                    <option value="Anniversaire">Anniversaire</option>
                                    <option value="Mariage">Mariage</option>
                                    <option value="Naissance">Naissance</option>
                                    <option value="Crémaillère">Crémaillère</option>
                                    <option value="Plaisir">Juste pour le plaisir</option>
                                </select>
                                <div>▼</div>
                            </div>
                        </div>
                        <div>
                            <label>Date de l&#39;événement</label>
                            <div onClick={() => setShowCalendar(true)}>
                                <span>{formatteDisplayDate || "Choisir une date..."}</span>
                                <FontAwesomeIcon icon={faCalendar} />
                            </div>
                            <input type="hidden" name="eventDate" value={formattedInputDate}/>
                        </div>
                    </div>
                    <div>
                        <div>
                            <span>Garder cette liste privée ?</span>
                            <span>Si décoché, vos amis pourrons voir cette liste</span>
                        </div>
                        <label>
                            <input type="checkbox" name="isPrivate" defaultChecked />
                            <div></div>
                        </label>
                    </div>
                    <div>
                        <Link href="/home">Annuler</Link>
                        <button
                            type="submit"
                        >
                            Créer la liste
                        </button>
                    </div>
                </form>
                {showCalendar && (
                    <div>
                        <div onClick={() => setShowCalendar(false)}></div>
                        <div>
                            <div>
                                <button type="button" onClick={() => changeMonth(1)}>▶</button>
                            </div>
                            <div>
                                {weekDays.map(d => (
                                    <div key={d}>{d}</div>
                                ))}
                            </div>
                            <div>
                                {Array.from({ length: getFirstDayInMonth(viewDate) }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: getDaysInMonts(viewDate) }).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewDate.getMonth() && selectedDate?.getFullYear() === viewDate.getFullYear();
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleDateClick(day)}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCalendar(false)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );   
}