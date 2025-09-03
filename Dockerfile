#Use official lightweight Python image
FROM python:3.10-slim

#Set working directory inside container
WORKDIR /app

#Copy all files to container
COPY . .

#Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

#Expose port 8080 (Cloud Run expects this)
EXPOSE 8080

#Run the app with Gunicorn server
CMD ["gunicorn","-b","0.0.0.0:8080","app:app"]
