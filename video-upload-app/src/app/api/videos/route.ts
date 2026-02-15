import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/authOptions';
import connectDB from '@/lib/db';
import Video from '@/models/Video';
import { getVideoMetadata } from '@/lib/cloudinary';

// GET - List all videos with pagination and search
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId: session.user.id };
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    // Get videos
    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments(query),
    ]);

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get videos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// POST - Save video metadata after upload
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicId, title, description } = await req.json();

    if (!publicId || !title) {
      return NextResponse.json(
        { error: 'Public ID and title are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get full metadata from Cloudinary
    const metadata = await getVideoMetadata(publicId);

    // Save to database
    const video = await Video.create({
      userId: session.user.id,
      title,
      description,
      ...metadata,
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error: any) {
    console.error('Save video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save video' },
      { status: 500 }
    );
  }
}
