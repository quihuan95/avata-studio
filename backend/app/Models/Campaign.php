<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Campaign extends Model {
 protected $fillable=['name','subtitle','slug','frame_path','active','views','downloads'];
 protected $casts=['active'=>'boolean','views'=>'integer','downloads'=>'integer'];
 protected $appends=['frame_url'];
 public function getFrameUrlAttribute(): string { return str_starts_with($this->frame_path,'https://') ? $this->frame_path : asset('storage/'.$this->frame_path); }
}
