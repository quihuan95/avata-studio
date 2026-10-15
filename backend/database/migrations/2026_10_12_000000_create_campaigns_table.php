<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up(): void { Schema::create('campaigns', function (Blueprint $table) { $table->id(); $table->string('name'); $table->string('subtitle')->nullable(); $table->string('slug')->unique(); $table->string('frame_path'); $table->boolean('active')->default(true); $table->unsignedBigInteger('views')->default(0); $table->unsignedBigInteger('downloads')->default(0); $table->timestamps(); }); } public function down(): void { Schema::dropIfExists('campaigns'); } };
