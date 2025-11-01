const express = require('express');
const router = express.Router();
const supabase = require('../supabaseConfig');

router.get('/stats', async (req, res) => {
  try {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalTutors } = await supabase
      .from('tutor_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: pendingTutors } = await supabase
      .from('tutor_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    const { count: totalPosts } = await supabase
      .from('tuition_posts')
      .select('*', { count: 'exact', head: true });

    const { count: totalApplications } = await supabase
      .from('contact_applications')
      .select('*', { count: 'exact', head: true });

    const { count: pendingPosts } = await supabase
      .from('tuition_posts')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalTutors: totalTutors || 0,
        pendingTutors: pendingTutors || 0,
        totalPosts: totalPosts || 0,
        totalApplications: totalApplications || 0,
        pendingPosts: pendingPosts || 0  
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// Get all tutors 
router.get('/tutors/all', async (req, res) => {
  try {
    
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select(`
        *,
        profiles!tutor_profiles_user_id_fkey(email, phone, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const tutors = data.map(tutor => ({
      ...tutor,
      email: tutor.profiles.email,
      phone: tutor.profiles.phone,
      full_name: tutor.profiles.full_name
    }));

    res.json({
      success: true,
      tutors: tutors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get tutors by verification status 
router.get('/tutors/:status', async (req, res) => {
  const { status } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select(`
        *,
        profiles!tutor_profiles_user_id_fkey(email, phone, full_name)
      `)
      .eq('verification_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const tutors = data.map(tutor => ({
      ...tutor,
      email: tutor.profiles.email,
      phone: tutor.profiles.phone,
      full_name: tutor.profiles.full_name
    }));

    res.json({
      success: true,
      tutors: tutors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update tutor verification status 
router.put('/tutors/verify/:tutorId', async (req, res) => {
  const { tutorId } = req.params;
  const { status } = req.body; 
  
  try {
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ verification_status: status })
      .eq('id', tutorId);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: `Tutor ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// Get all users 
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      users: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete user route
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user role 
router.put('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: role })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// Get all posts 
router.get('/posts', async (req, res) => {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('tuition_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Get posts error:', postsError);
      return res.status(400).json({
        success: false,
        message: postsError.message
      });
    }

    const userIds = [...new Set(posts.map(post => post.user_id))];

    // Fetch all owners 
    const { data: owners, error: ownersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    if (ownersError) {
      console.error('Get owners error:', ownersError);
    }

    const ownerMap = {};
    if (owners) {
      owners.forEach(owner => {
        ownerMap[owner.id] = owner;
      });
    }

    const postsWithOwners = posts.map(post => ({
      ...post,
      owner_name: ownerMap[post.user_id]?.full_name || 'Unknown',
      owner_email: ownerMap[post.user_id]?.email || 'Unknown',
      owner_phone: ownerMap[post.user_id]?.phone || 'Unknown'
    }));

    res.json({
      success: true,
      posts: postsWithOwners
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete post 
router.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  
  try {
    const { error } = await supabase
      .from('tuition_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// Get posts 
router.get('/posts/status/:status', async (req, res) => {
  const { status } = req.params;
  
  try {
    const { data: posts, error: postsError } = await supabase
      .from('tuition_posts')
      .select('*')
      .eq('approval_status', status)
      .order('created_at', { ascending: false });

    if (postsError) {
      return res.status(400).json({
        success: false,
        message: postsError.message
      });
    }

    // Owner details 
    const userIds = [...new Set(posts.map(post => post.user_id))];
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    const ownerMap = {};
    if (owners) {
      owners.forEach(owner => {
        ownerMap[owner.id] = owner;
      });
    }

    const postsWithOwners = posts.map(post => ({
      ...post,
      owner_name: ownerMap[post.user_id]?.full_name || 'Unknown',
      owner_email: ownerMap[post.user_id]?.email || 'Unknown',
      owner_phone: ownerMap[post.user_id]?.phone || 'Unknown'
    }));

    res.json({
      success: true,
      posts: postsWithOwners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all posts
router.get('/posts/all-status', async (req, res) => {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('tuition_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      return res.status(400).json({
        success: false,
        message: postsError.message
      });
    }

    const userIds = [...new Set(posts.map(post => post.user_id))];
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    const ownerMap = {};
    if (owners) {
      owners.forEach(owner => {
        ownerMap[owner.id] = owner;
      });
    }

    const postsWithOwners = posts.map(post => ({
      ...post,
      owner_name: ownerMap[post.user_id]?.full_name || 'Unknown',
      owner_email: ownerMap[post.user_id]?.email || 'Unknown',
      owner_phone: ownerMap[post.user_id]?.phone || 'Unknown'
    }));

    res.json({
      success: true,
      posts: postsWithOwners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/posts/approve/:postId', async (req, res) => {
  const { postId } = req.params;
  const { status } = req.body; 
  try {
    const { error } = await supabase
      .from('tuition_posts')
      .update({ 
        is_approved: status === 'approved', 
        approval_status: status  
      })
      .eq('id', postId);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: `Post ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;