'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function CourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Dropdown data
    const [instructors, setInstructors] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        price: '',
        level: 'Beginner',
        duration: '',
        instructor_id: '',
        category_id: '',
        is_featured: false
    });

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const fetchDropdowns = async () => {
            const [instRes, catRes] = await Promise.all([
                fetch(`${apiUrl}/api/instructors/`),
                fetch(`${apiUrl}/api/categories/`)
            ]);
            setInstructors(await instRes.json());
            setCategories(await catRes.json());
        };

        fetchDropdowns();

        if (!isNew) {
            // Fetch existing data
            const fetchData = async () => {
                try {
                    const res = await fetch(`${apiUrl}/api/courses/${id}/`);
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            title: data.title,
                            slug: data.slug,
                            description: data.description,
                            price: data.price,
                            level: data.level,
                            duration: data.duration,
                            instructor_id: data.instructor?.id || '',
                            category_id: data.category?.id || '',
                            is_featured: data.is_featured
                        });
                    }
                } catch (error) {
                    console.error('Error fetching course:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isNew]);

    const handleChange = (e: any) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });

        // Auto-generate slug from title if new
        if (e.target.name === 'title' && isNew) {
            setFormData(prev => ({
                ...prev,
                title: value,
                slug: value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const url = isNew
                ? `${apiUrl}/api/courses/`
                : `${apiUrl}/api/courses/${id}/`;

            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push('/admin/courses');
            } else {
                const err = await res.json();
                alert('Error saving: ' + JSON.stringify(err));
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving data');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/courses" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'New Course' : 'Edit Course'}
                </h1>
                {!isNew && (
                    <Link
                        href={`/admin/courses/${id}/lessons`}
                        className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                        Manage Lessons
                    </Link>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                        <input
                            name="title"
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                        <input
                            name="slug"
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900"
                            value={formData.slug}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={4}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                        <select
                            name="instructor_id"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.instructor_id}
                            onChange={handleChange}
                        >
                            <option value="">Select Instructor</option>
                            {instructors.map((opt: any) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category_id"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.category_id}
                            onChange={handleChange}
                        >
                            <option value="">Select Category</option>
                            {categories.map((opt: any) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <input
                            name="price"
                            type="number"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.price}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                            name="level"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.level}
                            onChange={handleChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <input
                            name="duration"
                            type="text"
                            placeholder="e.g. 2 Hours"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            value={formData.duration}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                name="is_featured"
                                type="checkbox"
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                checked={formData.is_featured}
                                onChange={handleChange}
                            />
                            <span className="text-gray-900 font-medium">Featured Course</span>
                        </label>
                    </div>

                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Course'}
                    </button>
                </div>
            </form>
        </div>
    );
}
