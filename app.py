from flask import Flask,request,jsonify
import pickle
import numpy as np

app=Flask(__name__)

#Load models
with open('models/logistic_model.pkl','rb') as f:
    logistic_model=pickle.load(f)

with open('models/kmeans_model.pkl','rb') as f:
    kmeans_model=pickle.load(f)

# Home endpoint (health check)
@app.route("/",methods=["GET"])
def home():
    return jsonify({'message':'Iris ML API is running'},200)

#Prediction endpoint
@app.route("/predict",methods=['POST'])
def predict():
    try:
        data=request.get_json()

        model_type=data.get('model_type')
        features=data.get('features')
        if not model_type or not features:
            return jsonify({'error':'model_type and features required'},400)
        
        #Convert features to numpy array (2D)
        features_array=np.array(features).reshape(1,-1)

        if model_type=='logreg':
            prediction=logistic_model.predict(features_array)[0]
        elif model_type=='kmeans':
            prediction=kmeans_model.predict(features_array)[0]
        else:
            return jsonify({'error':"Invalid model_type. Use 'logreg' or 'kmeans'."}),400
        
        return jsonify({'model_type':model_type,'features':features,'prediction':int(prediction)})

    except Exception as e:
        return jsonify({'error':str(e)}),500

if __name__=="__main__":
    app.run(debug=True)
